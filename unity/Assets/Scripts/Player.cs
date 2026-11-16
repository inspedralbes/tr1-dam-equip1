using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using NativeWebSocket;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

public class Player : MonoBehaviour
{
    private UIScript uiScript;
    public static Player Instance;

    public string Nick;
    public int Code;
    public bool IsHost;
    public List<string> PlayersInRoom = new List<string>();
    public List<string> Categories = new List<string>();
    public string SelectedCategory = "";

    public RoundStartedMessage LastRoundStarted;
    public RoundResultsMessage LastRoundResults;

    public void SetPlayersAndEnterRoom(int code, PlayerData[] players)
    {
        Code = code;
        SavePlayersList(players);

        if (SceneManager.GetActiveScene().buildIndex != 1)
        {
            SceneManager.LoadScene(1);
        }
        else if (UIScriptWs.Instance != null)
        {
            UIScriptWs.Instance.EnqueuePlayersList(PlayersInRoom);
        }
    }

    public void UpdatePlayers(PlayerData[] players)
    {
        SavePlayersList(players);

        if (UIScriptWs.Instance != null)
        {
            UIScriptWs.Instance.EnqueuePlayersList(PlayersInRoom);
        }
    }

    public void SetCategories(string[] cats)
    {
        Categories.Clear();
        if (cats != null)
        {
            Categories.AddRange(cats);
        }

        if (SceneManager.GetActiveScene().buildIndex != 2)
        {
            SceneManager.LoadScene(2);
        }
        else if (CategoriaScript.Instance != null)
        {
            CategoriaScript.Instance.OnCategoriesReceived(Categories.ToArray(), PlayersInRoom.Count);
        }
    }

    private void SavePlayersList(PlayerData[] players)
    {
        PlayersInRoom.Clear();
        if (players == null)
            return;

        foreach (PlayerData p in players)
        {
            PlayersInRoom.Add(p.name);
        }
    }

    public void SetUiScript(UIScript script)
    {
        uiScript = script;
    }

    public static void Tester()
    {
        Debug.Log("Hola");
    }

    public void PlayerValues(string nom)
    {
        Nick = nom;
        Code = 0;
    }

    public void PlayerValues(string nom, string sala)
    {
        Nick = nom;
        Code = int.Parse(sala);
    }

    public void adjustCode(Int32 code)
    {
        Code = code;
        Debug.Log("Código guardado en Player: " + Code);
        SceneManager.LoadScene(1);
    }

    private void OnEnable()
    {
        SceneManager.sceneLoaded += OnSceneLoaded;
    }

    private void OnDisable()
    {
        SceneManager.sceneLoaded -= OnSceneLoaded;
    }

    private void OnSceneLoaded(Scene scene, LoadSceneMode mode)
    {
        if (scene.buildIndex == 2 || scene.name == "Categoria")
        {
            if (CategoriaScript.Instance == null)
            {
                var catGo = GameObject.Find("Categoria");
                if (catGo != null && catGo.GetComponent<CategoriaScript>() == null)
                {
                    catGo.AddComponent<CategoriaScript>();
                }
            }
        }
    }

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }
}
