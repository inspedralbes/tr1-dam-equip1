using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using NativeWebSocket;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

public class UIScriptWs : MonoBehaviour
{
    private UIDocument _uiDocument;
    private Button EnviarButton;
    private Button NickButton;
    private Button btnStart;
    private Label CodiSala;
    private TextField NickField;
    private TextField MissatgeField;
    private ScrollView chatArea;
    private Button crearsala;
    private VisualElement playersList;

    private readonly Queue<string> pendingPlayers = new Queue<string>();
    private List<string> pendingPlayersList = null;

    public static UIScriptWs Instance;

    private void Awake()
    {
        Instance = this;
    }

    void Start()
    {
        _uiDocument = GetComponent<UIDocument>();
        EnviarButton = _uiDocument.rootVisualElement.Q<Button>("enviar");
        crearsala = _uiDocument.rootVisualElement.Q<Button>("crearsala");
        NickButton = _uiDocument.rootVisualElement.Q<Button>("BtnXat");
        NickField = _uiDocument.rootVisualElement.Q<TextField>("nickname");
        MissatgeField = _uiDocument.rootVisualElement.Q<TextField>("MissatgeField");
        chatArea = _uiDocument.rootVisualElement.Q<ScrollView>("xatarea");
        CodiSala = _uiDocument.rootVisualElement.Q<Label>("code");
        playersList = _uiDocument.rootVisualElement.Q<VisualElement>("Players");
        btnStart = _uiDocument.rootVisualElement.Q<Button>("Start");

        btnStart.clicked += (
            () =>
            {
                if (WebSocketClient.Instance != null)
                {
                    WebSocketClient.Instance.SendWebSocketMessage(
                        "{\"type\":\"startCategoryVote\"}"
                    );
                }
            }
        );

        if (Player.Instance != null)
        {
            CodiSala.text = "Sala: " + Player.Instance.Code.ToString();

            if (NickField != null)
            {
                NickField.value = Player.Instance.Nick;
            }

            RenderPlayersList(Player.Instance.PlayersInRoom);
            UpdateStartButtonVisibility();
            Debug.Log(
                "Datos recuperados - Nick: "
                    + Player.Instance.Nick
                    + " | Código: "
                    + Player.Instance.Code
            );
        }
        else
        {
            Debug.LogWarning("No se encontró una instancia de Player activa.");
        }
    }

    public void StartGame()
    {
        SceneManager.LoadScene(2);
    }

    private void UpdateStartButtonVisibility()
    {
        if (btnStart == null)
            return;

        bool isHost = Player.Instance != null && Player.Instance.IsHost;

        btnStart.style.display = isHost ? DisplayStyle.Flex : DisplayStyle.None;
        btnStart.SetEnabled(isHost);
    }

    public void UpdateRoomCode(int newCode)
    {
        if (CodiSala != null)
        {
            CodiSala.text = "Sala: " + newCode.ToString();
        }
    }

    public void EnqueuePlayer(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return;

        lock (pendingPlayers)
        {
            pendingPlayers.Enqueue(name);
        }
    }

    public void EnqueuePlayersList(List<string> players)
    {
        if (players == null)
            return;

        lock (pendingPlayers)
        {
            pendingPlayersList = new List<string>(players);
        }
    }

    private void Update()
    {
        List<string> listToUpdate = null;

        lock (pendingPlayers)
        {
            if (pendingPlayersList != null)
            {
                listToUpdate = pendingPlayersList;
                pendingPlayersList = null;
            }
        }

        if (listToUpdate != null)
        {
            RenderPlayersList(listToUpdate);
        }

        while (true)
        {
            string playerName = null;

            lock (pendingPlayers)
            {
                if (pendingPlayers.Count == 0)
                    break;

                playerName = pendingPlayers.Dequeue();
            }

            AddPlayerToList(playerName);
        }
    }

    private void RenderPlayersList(List<string> players)
    {
        if (playersList == null || players == null)
            return;

        playersList.Clear();
        foreach (string playerName in players)
        {
            AddPlayerToList(playerName);
        }
    }

    private void AddPlayerToList(string playerName)
    {
        if (playersList == null || string.IsNullOrWhiteSpace(playerName))
            return;

        if (HasPlayer(playerName))
            return;

        var chip = new VisualElement();
        chip.AddToClassList("player-chip");

        var label = new Label(playerName);
        label.AddToClassList("player-name");
        chip.Add(label);

        playersList.Add(chip);
    }

    private bool HasPlayer(string playerName)
    {
        foreach (var child in playersList.Children())
        {
            if (child is Label label && label.text == playerName)
                return true;

            if (child is VisualElement container)
            {
                foreach (var subChild in container.Children())
                {
                    if (subChild is Label l && l.text == playerName)
                        return true;
                }
            }
        }

        return false;
    }
}
