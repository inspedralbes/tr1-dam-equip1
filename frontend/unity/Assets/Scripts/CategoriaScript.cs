using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UIElements;

public class CategoriaScript : MonoBehaviour
{
    public static CategoriaScript Instance;

    private UIDocument _uiDocument;
    private Label titleLabel;
    private Label statusLabel;
    private Label votedCountLabel;
    private Label winnerLabel;

    private Button btnCat1;
    private Button btnCat2;
    private Button btnCat3;
    private Button btnCat4;

    private List<Button> categoryButtons = new List<Button>();
    private bool hasVoted = false;
    private string myVote = "";

    private void Awake()
    {
        Instance = this;
    }

    private void Start()
    {
        _uiDocument = GetComponent<UIDocument>();
        if (_uiDocument != null && _uiDocument.rootVisualElement != null)
        {
            var root = _uiDocument.rootVisualElement;

            titleLabel = root.Q<Label>("titleLabel");
            statusLabel = root.Q<Label>("statusLabel");
            votedCountLabel = root.Q<Label>("votedCountLabel");
            winnerLabel = root.Q<Label>("winnerLabel");

            btnCat1 = root.Q<Button>("btnCat1");
            btnCat2 = root.Q<Button>("btnCat2");
            btnCat3 = root.Q<Button>("btnCat3");
            btnCat4 = root.Q<Button>("btnCat4");

            categoryButtons.Clear();
            if (btnCat1 != null)
                categoryButtons.Add(btnCat1);
            if (btnCat2 != null)
                categoryButtons.Add(btnCat2);
            if (btnCat3 != null)
                categoryButtons.Add(btnCat3);
            if (btnCat4 != null)
                categoryButtons.Add(btnCat4);

            for (int i = 0; i < categoryButtons.Count; i++)
            {
                int index = i;
                categoryButtons[index].clicked += () => OnCategoryButtonClicked(index);
            }
        }

        // Si el Player ja té les categories guardades abans d'iniciar l'escena:
        if (
            Player.Instance != null
            && Player.Instance.Categories != null
            && Player.Instance.Categories.Count >= 4
        )
        {
            SetupButtons(Player.Instance.Categories.ToArray());
            if (votedCountLabel != null)
            {
                votedCountLabel.text = "Vots: 0 / " + Player.Instance.PlayersInRoom.Count;
            }
        }
    }

    public void OnCategoriesReceived(string[] categories, int totalPlayers)
    {
        SetupButtons(categories);
        hasVoted = false;
        myVote = "";

        if (statusLabel != null)
        {
            statusLabel.text = "Vota quina categoria vols jugar aquesta ronda";
        }
        if (votedCountLabel != null)
        {
            votedCountLabel.text = "Vots: 0 / " + totalPlayers;
        }
        if (winnerLabel != null)
        {
            winnerLabel.style.display = DisplayStyle.None;
        }
    }

    private void SetupButtons(string[] categories)
    {
        for (int i = 0; i < categoryButtons.Count; i++)
        {
            if (categoryButtons[i] != null && i < categories.Length)
            {
                categoryButtons[i].text = categories[i];
                categoryButtons[i].SetEnabled(true);
                categoryButtons[i].RemoveFromClassList("btn-voted");
                categoryButtons[i].RemoveFromClassList("btn-winner");
            }
        }
    }

    private void OnCategoryButtonClicked(int index)
    {
        if (hasVoted)
            return;
        if (index >= categoryButtons.Count)
            return;

        Button clickedBtn = categoryButtons[index];
        myVote = clickedBtn.text;
        hasVoted = true;

        clickedBtn.AddToClassList("btn-voted");

        // Desactivem els botons per evitar duplicar vots
        foreach (var btn in categoryButtons)
        {
            btn.SetEnabled(false);
        }

        if (statusLabel != null)
        {
            statusLabel.text = "Has votat: " + myVote + " (Esperant la resta...)";
        }

        // Enviem el vot al servidor per WebSocket
        if (WebSocketClient.Instance != null)
        {
            string json = "{\"type\":\"voteCategory\",\"category\":\"" + myVote + "\"}";
            WebSocketClient.Instance.SendWebSocketMessage(json);
            Debug.Log("Vot de categoria enviat: " + myVote);
        }
    }

    public void OnPlayerVoted(string playerName, int votedCount, int totalPlayers)
    {
        votedCountLabel.text = "Vots: " + votedCount + " / " + totalPlayers;
    }

    public void OnCategorySelected(string winningCategory)
    {
        Debug.Log("Categoria guanyadora rebuda: " + winningCategory);

        statusLabel.text = "Votació finalitzada";
        winnerLabel.text = "Categoria triada: " + winningCategory;
        winnerLabel.style.display = DisplayStyle.Flex;

        // Resaltem el botó guanyador en verd
        foreach (var btn in categoryButtons)
        {
            if (btn != null)
            {
                btn.SetEnabled(false);
                if (
                    btn
                        .text.Trim()
                        .Equals(winningCategory.Trim(), StringComparison.OrdinalIgnoreCase)
                )
                {
                    btn.AddToClassList("btn-winner");
                }
            }
        }
        StartCoroutine(LoadNextSceneAfterDelay(3f));
    }

    private IEnumerator LoadNextSceneAfterDelay(float delay)
    {
        yield return new WaitForSeconds(delay);

        // Asegúrate de que la escena esté añadida en las Build Settings de Unity
        SceneManager.LoadScene(3);
    }
}
