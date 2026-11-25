using System;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

public class UIScript : MonoBehaviour
{
    private UIDocument _uiDocument;
    private Button Unirse;
    private Button CrearSala;
    private Button BtnConfirmarCrear;
    private TextField NickField;
    private TextField Codi_Sala;
    private VisualElement CodiContainer;
    private VisualElement CrearContainer;

    private Button btnMax5;
    private Button btnMax10;
    private Button btnMax15;
    private Button btnRounds5;
    private Button btnRounds10;
    private Button btnRounds15;

    private int selectedMaxPlayers = 10;
    private int selectedRounds = 5;

    public GameObject Jugador;
    public GameObject WebSocket;

    void Start()
    {
        _uiDocument = GetComponent<UIDocument>();
        var root = _uiDocument.rootVisualElement;

        Unirse = root.Q<Button>("Uneix-Me");
        CrearSala = root.Q<Button>("CrearSala");
        BtnConfirmarCrear = root.Q<Button>("BtnConfirmarCrear");
        NickField = root.Q<TextField>("Nom");
        Codi_Sala = root.Q<TextField>("CodiSala");
        CodiContainer = root.Q<VisualElement>("CodiContainer");
        CrearContainer = root.Q<VisualElement>("CrearContainer");

        btnMax5 = root.Q<Button>("BtnMax5");
        btnMax10 = root.Q<Button>("BtnMax10");
        btnMax15 = root.Q<Button>("BtnMax15");

        btnRounds5 = root.Q<Button>("BtnRounds5");
        btnRounds10 = root.Q<Button>("BtnRounds10");
        btnRounds15 = root.Q<Button>("BtnRounds15");

        if (CodiContainer != null) CodiContainer.style.display = DisplayStyle.None;
        if (CrearContainer != null) CrearContainer.style.display = DisplayStyle.None;

        if (Jugador != null) Jugador.GetComponent<Player>().SetUiScript(this);
        if (WebSocket != null) WebSocket.GetComponent<WebSocketClient>().SetUiScript(this);

        if (btnMax5 != null) btnMax5.clicked += () => SetMaxPlayers(5);
        if (btnMax10 != null) btnMax10.clicked += () => SetMaxPlayers(10);
        if (btnMax15 != null) btnMax15.clicked += () => SetMaxPlayers(15);

        if (btnRounds5 != null) btnRounds5.clicked += () => SetRounds(5);
        if (btnRounds10 != null) btnRounds10.clicked += () => SetRounds(10);
        if (btnRounds15 != null) btnRounds15.clicked += () => SetRounds(15);

        Unirse.clicked += () =>
        {
            if (CrearContainer != null) CrearContainer.style.display = DisplayStyle.None;

            bool estaAmagat = (CodiContainer != null && CodiContainer.style.display == DisplayStyle.None)
                           || (CodiContainer == null && Codi_Sala != null && Codi_Sala.style.display == DisplayStyle.None);

            if (estaAmagat)
            {
                if (CodiContainer != null) CodiContainer.style.display = DisplayStyle.Flex;
                if (Codi_Sala != null)
                {
                    Codi_Sala.style.display = DisplayStyle.Flex;
                    Codi_Sala.Focus();
                }
                return;
            }

            if (Codi_Sala == null || string.IsNullOrWhiteSpace(Codi_Sala.value))
            {
                Debug.LogWarning("Has d'escriure el codi de la sala per unir-te!");
                return;
            }

            string nom = (NickField != null && !string.IsNullOrWhiteSpace(NickField.value)) 
                ? NickField.value 
                : "Jugador";

            if (Jugador != null)
            {
                Jugador.GetComponent<Player>().PlayerValues(nom, Codi_Sala.value);
            }

            if (WebSocketClient.Instance != null)
            {
                WebSocketClient.Instance.SendWebSocketMessage(
                    $"{{\"type\":\"joinRoom\",\"roomId\":\"{Codi_Sala.value}\",\"name\":\"{nom}\"}}"
                );
            }
            Debug.Log("Unint-se a la sala: " + Codi_Sala.value);
        };

        CrearSala.clicked += () =>
        {
            if (CodiContainer != null) CodiContainer.style.display = DisplayStyle.None;

            if (CrearContainer != null && CrearContainer.style.display == DisplayStyle.None)
            {
                CrearContainer.style.display = DisplayStyle.Flex;
                return;
            }

            EnviarCreacioSala();
        };

        if (BtnConfirmarCrear != null)
        {
            BtnConfirmarCrear.clicked += () =>
            {
                EnviarCreacioSala();
            };
        }
    }

    private void SetMaxPlayers(int val)
    {
        selectedMaxPlayers = val;
        if (btnMax5 != null) btnMax5.RemoveFromClassList("btn-selected");
        if (btnMax10 != null) btnMax10.RemoveFromClassList("btn-selected");
        if (btnMax15 != null) btnMax15.RemoveFromClassList("btn-selected");

        if (val == 5 && btnMax5 != null) btnMax5.AddToClassList("btn-selected");
        if (val == 10 && btnMax10 != null) btnMax10.AddToClassList("btn-selected");
        if (val == 15 && btnMax15 != null) btnMax15.AddToClassList("btn-selected");
    }

    private void SetRounds(int val)
    {
        selectedRounds = val;
        if (btnRounds5 != null) btnRounds5.RemoveFromClassList("btn-selected");
        if (btnRounds10 != null) btnRounds10.RemoveFromClassList("btn-selected");
        if (btnRounds15 != null) btnRounds15.RemoveFromClassList("btn-selected");

        if (val == 5 && btnRounds5 != null) btnRounds5.AddToClassList("btn-selected");
        if (val == 10 && btnRounds10 != null) btnRounds10.AddToClassList("btn-selected");
        if (val == 15 && btnRounds15 != null) btnRounds15.AddToClassList("btn-selected");
    }

    private void EnviarCreacioSala()
    {
        string nom = (NickField != null && !string.IsNullOrWhiteSpace(NickField.value)) 
            ? NickField.value 
            : "Jugador";

        if (Jugador != null)
        {
            Jugador.GetComponent<Player>().PlayerValues(nom);
        }

        if (WebSocketClient.Instance != null)
        {
            WebSocketClient.Instance.SendWebSocketMessage(
                $"{{\"type\":\"createRoom\",\"name\":\"{nom}\",\"maxPlayers\":{selectedMaxPlayers},\"totalRounds\":{selectedRounds}}}"
            );
        }
        Debug.Log("Creant nova sala per a: " + nom + " (Max: " + selectedMaxPlayers + ", Rondes: " + selectedRounds + ")");
    }

    public void MostrarMissage(string missatge) { }
}
