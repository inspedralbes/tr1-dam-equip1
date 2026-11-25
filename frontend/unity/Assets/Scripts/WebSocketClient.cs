using System;
using System.Text;
using System.Threading.Tasks;
using NativeWebSocket;
using UnityEngine;
using UnityEngine.UIElements;

public class identificador
{
    public string type;
}

[System.Serializable]
public class RoomCreatedMessage
{
    public string type;
    public int roomId;
    public bool isHost;
    public string name;
    public PlayerData[] players;
    public int maxPlayers;
    public int totalRounds;
}

[System.Serializable]
public class RoomJoinedMessage
{
    public string type;
    public int roomId;
    public bool isHost;
    public string name;
    public PlayerData[] players;
    public int totalRounds;
}

[System.Serializable]
public class PlayerJoinedMessage
{
    public string type;
    public PlayerData player;
    public PlayerData[] players;
}

[System.Serializable]
public class CategoryVoteStartedMessage
{
    public string type;
    public string[] categories;
    public int totalPlayers;
}

[System.Serializable]
public class CategoryVotedMessage
{
    public string type;
    public int id;
    public string name;
    public string category;
    public int votedCount;
    public int totalPlayers;
}

[System.Serializable]
public class CategorySelectedMessage
{
    public string type;
    public string category;
}

[System.Serializable]
public class PlayerData
{
    public int id;
    public string name;
    public int score;
}

[System.Serializable]
public class RoundStartedMessage
{
    public string type;
    public int round;
    public int totalRounds;
    public string question;
    public int min;
    public int max;
    public string unit;
    public int totalPlayers;
}

[System.Serializable]
public class TimerStartedMessage
{
    public string type;
    public int seconds;
}

[System.Serializable]
public class PlayerRoundResult
{
    public int id;
    public string name;
    public int estimate;
    public int roundPoints;
    public int score;
}

[System.Serializable]
public class RoundResultsMessage
{
    public string type;
    public int round;
    public int totalRounds;
    public string question;
    public int correctAnswer;
    public int min;
    public int max;
    public string unit;
    public PlayerRoundResult[] results;
    public PlayerData[] ranking;
}

[System.Serializable]
public class GameOverMessage
{
    public string type;
    public PlayerData[] ranking;
}

public class WebSocketClient : MonoBehaviour
{
    [Header("Configuració del WebSocket")]
    [SerializeField]
    private string websocketUrl = "wss://echo.websocket.org";

    [Header("Tests des de l'editor")]
    [SerializeField]
    private string testMessage = "Hola des de Unity!";
    private TextElement messageDisplay;

    public static WebSocketClient Instance;

    WebSocket websocket;
    private string[] Parts;

    private UIScript uiScript;

    private async void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
            return;
        }

        await ConnectWebSocket();
    }

    public void SetUiScript(UIScript script)
    {
        uiScript = script;
    }

    private async Task ConnectWebSocket()
    {
        websocket = new WebSocket(websocketUrl);
        websocket.OnOpen += () =>
        {
            Debug.Log("WebSocket connectat!");
        };
        websocket.OnError += (e) =>
        {
            Debug.LogError("WebSocket error: " + e);
        };
        websocket.OnClose += (e) =>
        {
            Debug.Log("WebSocket tancat!");
        };
        websocket.OnMessage += (bytes) =>
        {
            string message = Encoding.UTF8.GetString(bytes);
            identificador tipus = JsonUtility.FromJson<identificador>(message);
            Debug.Log(tipus.type);
            if (tipus.type == "roomCreated")
            {
                RoomCreatedMessage inf = JsonUtility.FromJson<RoomCreatedMessage>(message);
                Debug.Log("Code");
                Debug.Log(inf.roomId);
                if (!string.IsNullOrEmpty(inf.name))
                {
                    Player.Instance.Nick = inf.name;
                }
                Player.Instance.adjustCode(inf.roomId);
                Player.Instance.IsHost = inf.isHost;
                Player.Instance.SetPlayersAndEnterRoom(inf.roomId, inf.players);
            }
            else if (tipus.type == "roomJoined")
            {
                RoomJoinedMessage inf = JsonUtility.FromJson<RoomJoinedMessage>(message);
                if (!string.IsNullOrEmpty(inf.name))
                {
                    Player.Instance.Nick = inf.name;
                }
                Player.Instance.adjustCode(inf.roomId);
                Player.Instance.IsHost = inf.isHost;
                Player.Instance.SetPlayersAndEnterRoom(inf.roomId, inf.players);
            }
            else if (tipus.type == "playerJoined")
            {
                PlayerJoinedMessage inf = JsonUtility.FromJson<PlayerJoinedMessage>(message);
                if (UIScriptWs.Instance != null)
                {
                    UIScriptWs.Instance.EnqueuePlayer(inf.player.name);
                }
                Player.Instance.UpdatePlayers(inf.players);
            }
            else if (tipus.type == "categoryVoteStarted")
            {
                CategoryVoteStartedMessage inf = JsonUtility.FromJson<CategoryVoteStartedMessage>(
                    message
                );
                if (Player.Instance != null)
                {
                    Player.Instance.SetCategories(inf.categories);
                }
                if (CategoriaScript.Instance != null)
                {
                    CategoriaScript.Instance.OnCategoriesReceived(inf.categories, inf.totalPlayers);
                }
                if (UIScriptWs.Instance != null)
                {
                    UIScriptWs.Instance.StartGame();
                }
            }
            else if (tipus.type == "categoryVoted")
            {
                CategoryVotedMessage inf = JsonUtility.FromJson<CategoryVotedMessage>(message);
                if (CategoriaScript.Instance != null)
                {
                    CategoriaScript.Instance.OnPlayerVoted(
                        inf.name,
                        inf.votedCount,
                        inf.totalPlayers
                    );
                }
            }
            else if (tipus.type == "categorySelected")
            {
                CategorySelectedMessage inf = JsonUtility.FromJson<CategorySelectedMessage>(
                    message
                );
                if (Player.Instance != null)
                {
                    Player.Instance.SelectedCategory = inf.category;
                }
                if (CategoriaScript.Instance != null)
                {
                    CategoriaScript.Instance.OnCategorySelected(inf.category);
                }
            }
            else if (tipus.type == "roundStarted")
            {
                RoundStartedMessage inf = JsonUtility.FromJson<RoundStartedMessage>(message);
                if (Player.Instance != null)
                {
                    Player.Instance.LastRoundStarted = inf;
                }
                if (Pregunta.Instance != null)
                {
                    Pregunta.Instance.OnRoundStarted(inf);
                }
            }
            else if (tipus.type == "timerStarted")
            {
                TimerStartedMessage inf = JsonUtility.FromJson<TimerStartedMessage>(message);
                if (Pregunta.Instance != null)
                {
                    Pregunta.Instance.OnTimerStarted(inf.seconds);
                }
            }
            else if (tipus.type == "roundResults")
            {
                RoundResultsMessage inf = JsonUtility.FromJson<RoundResultsMessage>(message);
                if (Player.Instance != null)
                {
                    Player.Instance.LastRoundResults = inf;
                }
                if (Pregunta.Instance != null)
                {
                    Pregunta.Instance.OnRoundResults(inf);
                }
            }
            else if (tipus.type == "gameOver")
            {
                GameOverMessage inf = JsonUtility.FromJson<GameOverMessage>(message);
                if (Pregunta.Instance != null)
                {
                    Pregunta.Instance.OnGameOver(inf);
                }
            }
            else if (tipus.type == "gameRestarted")
            {
                if (Pregunta.Instance != null)
                {
                    Pregunta.Instance.OnGameRestarted();
                }
            }
            Debug.Log(message);
        };
        await websocket.Connect();
    }

    public async void SendWebSocketMessage(string message)
    {
        if (websocket != null && websocket.State == WebSocketState.Open)
        {
            await websocket.SendText(message);
            Debug.Log("Missatge enviat: " + message);
        }
        else
        {
            Debug.LogWarning("No es pot enviar el missatge: connexió no oberta.");
        }
    }

    void Update()
    {
        if (websocket != null)
        {
            websocket.DispatchMessageQueue();
        }
    }

    private async void OnApplicationQuit()
    {
        if (websocket != null)
        {
            await websocket.Close();
        }
    }

    public void SendSerializedMessage()
    {
        if (string.IsNullOrEmpty(testMessage))
        {
            Debug.LogWarning("testMessage està buit, no envio res.");
            return;
        }
        SendWebSocketMessage(testMessage);
    }

    [ContextMenu("WebSocket/Enviar missatge de prova")]
    private void ContextSendTestMessage()
    {
        SendSerializedMessage();
    }
}
