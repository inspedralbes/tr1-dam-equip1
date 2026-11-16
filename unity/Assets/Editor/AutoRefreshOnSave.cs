using System;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace Editor
{
    [InitializeOnLoad]
    public static class AutoRefreshOnSave
    {
        private static FileSystemWatcher s_Watcher;
        private static bool s_NeedsRefresh;
        private static double s_LastEventTime;
        private const double DebounceSeconds = 0.5;

        static AutoRefreshOnSave()
        {
            if (Application.platform != RuntimePlatform.LinuxEditor) return;

            string assetsPath = Application.dataPath;
            try
            {
                s_Watcher = new FileSystemWatcher(assetsPath)
                {
                    IncludeSubdirectories = true,
                    NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.CreationTime,
                    Filter = "*.cs",
                    EnableRaisingEvents = true
                };

                s_Watcher.Changed += OnFileChanged;
                s_Watcher.Created += OnFileChanged;
                s_Watcher.Deleted += OnFileChanged;

                EditorApplication.update += OnEditorUpdate;
                AssemblyReloadEvents.beforeAssemblyReload += OnBeforeAssemblyReload;
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[AutoRefresh] FileSystemWatcher could not start: " + ex.Message);
            }
        }

        private static void OnFileChanged(object sender, FileSystemEventArgs e)
        {
            if (string.IsNullOrEmpty(e.Name)) return;
            if (e.Name.EndsWith(".meta", StringComparison.OrdinalIgnoreCase)) return;
            if (e.Name.StartsWith(".")) return;

            s_NeedsRefresh = true;
            s_LastEventTime = EditorApplication.timeSinceStartup;
        }

        private static void OnEditorUpdate()
        {
            if (!s_NeedsRefresh) return;
            if (EditorApplication.isPlaying || EditorApplication.isCompiling) return;

            if (EditorApplication.timeSinceStartup - s_LastEventTime >= DebounceSeconds)
            {
                s_NeedsRefresh = false;
                AssetDatabase.Refresh(ImportAssetOptions.ForceUpdate);
            }
        }

        private static void OnBeforeAssemblyReload()
        {
            if (s_Watcher != null)
            {
                s_Watcher.EnableRaisingEvents = false;
                s_Watcher.Dispose();
                s_Watcher = null;
            }
        }
    }
}
