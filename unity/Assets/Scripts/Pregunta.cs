using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

public class Pregunta : MonoBehaviour
{
    public static Pregunta Instance;
    private UIDocument _uiDocument;

    // Panells
    private VisualElement preguntaPanel;
    private VisualElement respostaPanel;
    private VisualElement finalPanel;

    // Elements comuns / Header
    private Label nomLabelPregunta;
    private Button btnSeguent;
    private Button btnNovaPartida;

    // Elements Pregunta
    private Label rondaLabel;
    private Label textPreguntaLabel;
    private Label timerLabel;
    private Slider sliderEstimacio;
    private Label minValLabel;
    private Label maxValLabel;
    private Label estimacioValLabel;
    private Button btnEnviarEstimacio;

    // Elements Resposta
    private Label textRespostaPreguntaLabel;
    private Label correctAnswerLabel;
    private Label scaleMinLabel;
    private Label scaleMaxLabel;
    private VisualElement markersContainer;
    private VisualElement posicionsContainer;

    // Elements Final
    private Label p1Name;
    private Label p1Score;
    private Label p2Name;
    private Label p2Score;
    private Label p3Name;
    private Label p3Score;
    private Label p4Text;
    private Label p5Text;
    private Label puntuacioUsuariLabel;

    private bool haRespost = false;
    private Coroutine timerCoroutine;
    private string unitatActual = "";

    private void Awake()
    {
        Instance = this;
    }

    void Start()
    {
        _uiDocument = GetComponent<UIDocument>();
        var root = _uiDocument.rootVisualElement;

        // Panells
        preguntaPanel = root.Q<VisualElement>("preguntaPanel");
        respostaPanel = root.Q<VisualElement>("respostaPanel");
        finalPanel = root.Q<VisualElement>("finalPanel");

        // Header
        nomLabelPregunta = root.Q<Label>("nomLabelPregunta");
        btnSeguent = root.Q<Button>("btnSeguent");
        btnNovaPartida = root.Q<Button>("btnNovaPartida");

        // Pregunta
        rondaLabel = root.Q<Label>("rondaLabel");
        textPreguntaLabel = root.Q<Label>("textPreguntaLabel");
        timerLabel = root.Q<Label>("timerLabel");
        sliderEstimacio = root.Q<Slider>("sliderEstimacio");
        minValLabel = root.Q<Label>("minValLabel");
        maxValLabel = root.Q<Label>("maxValLabel");
        estimacioValLabel = root.Q<Label>("estimacioValLabel");
        btnEnviarEstimacio = root.Q<Button>("btnEnviarEstimacio");

        // Resposta
        textRespostaPreguntaLabel = root.Q<Label>("textRespostaPreguntaLabel");
        correctAnswerLabel = root.Q<Label>("correctAnswerLabel");
        scaleMinLabel = root.Q<Label>("scaleMinLabel");
        scaleMaxLabel = root.Q<Label>("scaleMaxLabel");
        markersContainer = root.Q<VisualElement>("markersContainer");
        posicionsContainer = root.Q<VisualElement>("posicionsContainer");

        // Final
        p1Name = root.Q<Label>("p1Name");
        p1Score = root.Q<Label>("p1Score");
        p2Name = root.Q<Label>("p2Name");
        p2Score = root.Q<Label>("p2Score");
        p3Name = root.Q<Label>("p3Name");
        p3Score = root.Q<Label>("p3Score");
        p4Text = root.Q<Label>("p4Text");
        p5Text = root.Q<Label>("p5Text");
        puntuacioUsuariLabel = root.Q<Label>("puntuacioUsuariLabel");

        if (Player.Instance != null && nomLabelPregunta != null)
        {
            nomLabelPregunta.text = Player.Instance.Nick;
        }

        if (sliderEstimacio != null)
        {
            sliderEstimacio.RegisterValueChangedCallback(evt =>
            {
                int val = Mathf.RoundToInt(evt.newValue);
                if (estimacioValLabel != null)
                {
                    estimacioValLabel.text = "Estimació: " + val + (string.IsNullOrEmpty(unitatActual) ? "" : " " + unitatActual);
                }
            });
        }

        if (btnEnviarEstimacio != null)
        {
            btnEnviarEstimacio.clicked += () =>
            {
                if (haRespost) return;
                haRespost = true;
                btnEnviarEstimacio.SetEnabled(false);
                btnEnviarEstimacio.text = "Enviat!";
                int valor = Mathf.RoundToInt(sliderEstimacio.value);
                if (WebSocketClient.Instance != null)
                {
                    WebSocketClient.Instance.SendWebSocketMessage("{\"type\":\"submitAnswer\",\"estimate\":" + valor + "}");
                }
            };
        }

        if (btnSeguent != null)
        {
            btnSeguent.clicked += () =>
            {
                if (WebSocketClient.Instance != null)
                {
                    WebSocketClient.Instance.SendWebSocketMessage("{\"type\":\"nextRound\"}");
                }
            };
        }

        if (btnNovaPartida != null)
        {
            btnNovaPartida.clicked += () =>
            {
                if (WebSocketClient.Instance != null)
                {
                    WebSocketClient.Instance.SendWebSocketMessage("{\"type\":\"restartGame\"}");
                }
            };
        }

        if (Player.Instance != null && Player.Instance.LastRoundStarted != null)
        {
            OnRoundStarted(Player.Instance.LastRoundStarted);
        }
    }

    public void OnRoundStarted(RoundStartedMessage msg)
    {
        haRespost = false;
        unitatActual = msg.unit;
        if (timerCoroutine != null) StopCoroutine(timerCoroutine);

        if (preguntaPanel != null) preguntaPanel.style.display = DisplayStyle.Flex;
        if (respostaPanel != null) respostaPanel.style.display = DisplayStyle.None;
        if (finalPanel != null) finalPanel.style.display = DisplayStyle.None;

        if (btnSeguent != null) btnSeguent.style.display = DisplayStyle.None;
        if (btnNovaPartida != null) btnNovaPartida.style.display = DisplayStyle.None;

        if (rondaLabel != null) rondaLabel.text = "Ronda " + msg.round + " / " + msg.totalRounds;
        if (textPreguntaLabel != null) textPreguntaLabel.text = msg.question;
        if (timerLabel != null)
        {
            timerLabel.text = "";
            timerLabel.style.display = DisplayStyle.None;
        }

        if (sliderEstimacio != null)
        {
            sliderEstimacio.lowValue = msg.min;
            sliderEstimacio.highValue = msg.max;
            sliderEstimacio.value = (msg.min + msg.max) / 2f;
            if (estimacioValLabel != null)
            {
                estimacioValLabel.text = "Estimació: " + Mathf.RoundToInt(sliderEstimacio.value) + (string.IsNullOrEmpty(unitatActual) ? "" : " " + unitatActual);
            }
        }

        if (minValLabel != null) minValLabel.text = msg.min.ToString();
        if (maxValLabel != null) maxValLabel.text = msg.max.ToString() + (string.IsNullOrEmpty(msg.unit) ? "" : " " + msg.unit);

        if (btnEnviarEstimacio != null)
        {
            btnEnviarEstimacio.SetEnabled(true);
            btnEnviarEstimacio.text = "Enviar estimació";
        }
    }

    public void OnTimerStarted(int seconds)
    {
        if (timerCoroutine != null) StopCoroutine(timerCoroutine);
        timerCoroutine = StartCoroutine(TimerCountdown(seconds));
    }

    private IEnumerator TimerCountdown(int startSeconds)
    {
        int s = startSeconds;
        if (timerLabel != null) timerLabel.style.display = DisplayStyle.Flex;
        while (s >= 0)
        {
            if (timerLabel != null) timerLabel.text = "Temps: " + s + "s";
            yield return new WaitForSeconds(1f);
            s--;
        }
    }

    public void OnRoundResults(RoundResultsMessage msg)
    {
        if (timerCoroutine != null) StopCoroutine(timerCoroutine);

        if (preguntaPanel != null) preguntaPanel.style.display = DisplayStyle.None;
        if (respostaPanel != null) respostaPanel.style.display = DisplayStyle.Flex;
        if (finalPanel != null) finalPanel.style.display = DisplayStyle.None;

        if (btnNovaPartida != null) btnNovaPartida.style.display = DisplayStyle.None;

        if (textRespostaPreguntaLabel != null) textRespostaPreguntaLabel.text = msg.question;
        if (correctAnswerLabel != null)
        {
            correctAnswerLabel.text = "Resposta correcta: " + msg.correctAnswer + (string.IsNullOrEmpty(msg.unit) ? "" : " " + msg.unit);
        }

        if (btnSeguent != null)
        {
            btnSeguent.style.display = (Player.Instance != null && Player.Instance.IsHost) ? DisplayStyle.Flex : DisplayStyle.None;
        }

        if (scaleMinLabel != null) scaleMinLabel.text = msg.min.ToString();
        if (scaleMaxLabel != null) scaleMaxLabel.text = msg.max.ToString() + (string.IsNullOrEmpty(msg.unit) ? "" : " " + msg.unit);

        if (markersContainer != null)
        {
            markersContainer.Clear();
            float range = Mathf.Max(1f, msg.max - msg.min);

            // Filtrar i ordenar estimacions per valor per escalonar alçades
            List<PlayerRoundResult> valid = new List<PlayerRoundResult>();
            if (msg.results != null)
            {
                foreach (var r in msg.results)
                {
                    valid.Add(r);
                }
            }
            valid.Sort((a, b) => a.estimate.CompareTo(b.estimate));

            // Escalagament d'alçades (4 nivells) per evitar superposició de noms propers
            float[] lastPctAtTier = new float[] { -999f, -999f, -999f, -999f };

            foreach (var res in valid)
            {
                float pct = Mathf.Clamp((res.estimate - msg.min) / range * 100f, 3f, 97f);

                int tier = 0;
                bool found = false;
                for (int t = 0; t < 4; t++)
                {
                    if (pct - lastPctAtTier[t] >= 14f)
                    {
                        tier = t;
                        found = true;
                        break;
                    }
                }
                if (!found)
                {
                    float maxDiff = -1f;
                    for (int t = 0; t < 4; t++)
                    {
                        float diff = pct - lastPctAtTier[t];
                        if (diff > maxDiff)
                        {
                            maxDiff = diff;
                            tier = t;
                        }
                    }
                }
                lastPctAtTier[tier] = pct;

                float pinHeight = 32f + (tier * 28f);

                VisualElement pin = new VisualElement();
                pin.AddToClassList("marker-pin");
                pin.style.position = Position.Absolute;
                pin.style.left = Length.Percent(pct);
                pin.style.bottom = 0;
                pin.style.height = pinHeight;

                Label badge = new Label(res.name + " (" + res.estimate + ")");
                badge.AddToClassList("marker-badge");
                if (Player.Instance != null && res.name == Player.Instance.Nick)
                {
                    badge.AddToClassList("marker-badge-me");
                }

                VisualElement stem = new VisualElement();
                stem.AddToClassList("marker-stem");
                stem.style.height = Mathf.Max(4f, pinHeight - 22f);

                VisualElement dot = new VisualElement();
                dot.AddToClassList("marker-dot");

                pin.Add(badge);
                pin.Add(stem);
                pin.Add(dot);
                markersContainer.Add(pin);
            }

            // Marcador destacat de la resposta correcta
            float correctPct = Mathf.Clamp((msg.correctAnswer - msg.min) / range * 100f, 3f, 97f);
            VisualElement correctPin = new VisualElement();
            correctPin.AddToClassList("marker-pin");
            correctPin.AddToClassList("marker-correct-pin");
            correctPin.style.position = Position.Absolute;
            correctPin.style.left = Length.Percent(correctPct);
            correctPin.style.bottom = 0;
            correctPin.style.height = 145f;

            Label correctBadge = new Label("Resposta: " + msg.correctAnswer + (string.IsNullOrEmpty(msg.unit) ? "" : " " + msg.unit));
            correctBadge.AddToClassList("marker-correct-badge");

            VisualElement correctStem = new VisualElement();
            correctStem.AddToClassList("marker-correct-stem");
            correctStem.style.height = 118f;

            VisualElement correctDot = new VisualElement();
            correctDot.AddToClassList("marker-correct-dot");

            correctPin.Add(correctBadge);
            correctPin.Add(correctStem);
            correctPin.Add(correctDot);
            markersContainer.Add(correctPin);
        }

        // Posicions de la ronda
        if (posicionsContainer != null)
        {
            posicionsContainer.Clear();
            Label titol = new Label("Posicions ronda");
            titol.AddToClassList("posicions-title");
            posicionsContainer.Add(titol);

            if (msg.results != null)
            {
                for (int i = 0; i < msg.results.Length && i < 4; i++)
                {
                    var r = msg.results[i];
                    string posText = (i == 0 ? "1a posició: " : (i == 1 ? "2a posició: " : (i == 2 ? "3a posició: " : $"{i + 1}a posició: ")));
                    string ptsText = r.roundPoints > 0 ? " (+" + r.roundPoints + " pts)" : "";
                    Label item = new Label(posText + r.name + ptsText);
                    item.AddToClassList("posicio-item");
                    posicionsContainer.Add(item);
                }
            }
        }
    }

    public void OnGameOver(GameOverMessage msg)
    {
        if (timerCoroutine != null) StopCoroutine(timerCoroutine);

        if (preguntaPanel != null) preguntaPanel.style.display = DisplayStyle.None;
        if (respostaPanel != null) respostaPanel.style.display = DisplayStyle.None;
        if (finalPanel != null) finalPanel.style.display = DisplayStyle.Flex;

        if (btnSeguent != null) btnSeguent.style.display = DisplayStyle.None;

        if (btnNovaPartida != null)
        {
            btnNovaPartida.style.display = (Player.Instance != null && Player.Instance.IsHost) ? DisplayStyle.Flex : DisplayStyle.None;
        }

        if (msg.ranking != null && msg.ranking.Length > 0)
        {
            if (msg.ranking.Length >= 1)
            {
                if (p1Name != null) p1Name.text = msg.ranking[0].name;
                if (p1Score != null) p1Score.text = msg.ranking[0].score + " pts";
            }
            if (msg.ranking.Length >= 2)
            {
                if (p2Name != null) p2Name.text = msg.ranking[1].name;
                if (p2Score != null) p2Score.text = msg.ranking[1].score + " pts";
            }
            if (msg.ranking.Length >= 3)
            {
                if (p3Name != null) p3Name.text = msg.ranking[2].name;
                if (p3Score != null) p3Score.text = msg.ranking[2].score + " pts";
            }
            if (msg.ranking.Length >= 4)
            {
                if (p4Text != null) p4Text.text = "4. " + msg.ranking[3].name + " (" + msg.ranking[3].score + " pts)";
            }
            if (msg.ranking.Length >= 5)
            {
                if (p5Text != null) p5Text.text = "5. " + msg.ranking[4].name + " (" + msg.ranking[4].score + " pts)";
            }

            string myNick = Player.Instance != null ? Player.Instance.Nick : "";
            int myPos = 0;
            int myPts = 0;
            for (int i = 0; i < msg.ranking.Length; i++)
            {
                if (msg.ranking[i].name == myNick)
                {
                    myPos = i + 1;
                    myPts = msg.ranking[i].score;
                    break;
                }
            }

            if (puntuacioUsuariLabel != null)
            {
                if (myPos > 0)
                {
                    puntuacioUsuariLabel.text = myNick + ", has quedat en posició " + myPos + " amb " + myPts + " punts!";
                }
                else
                {
                    puntuacioUsuariLabel.text = "Partida finalitzada!";
                }
            }
        }
    }

    public void OnGameRestarted()
    {
        SceneManager.LoadScene(1);
    }
}
