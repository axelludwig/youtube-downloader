# YouTube Downloader (Node.js + yt-dlp + ffmpeg)

Petit serveur Node.js pour :

- Télécharger la **meilleure vidéo** YouTube
- Télécharger la **meilleure piste audio**
- **Fusionner** les deux en un seul `.mp4`
- Suivre l’**avancement en direct** via SSE (progression vidéo + audio + fusion)

---

## 🧩 Prérequis

- **Node.js** (version 18+ recommandée)
- **AUCUNE installation système nécessaire**
- Le projet utilise **des exécutables embarqués** :
  - `ffmpeg` / `ffmpeg.exe`
  - `ffprobe` / `ffprobe.exe`
  - `yt-dlp` / `yt-dlp.exe`

👉 Les versions Windows, Linux ou macOS doivent simplement être placées dans les bons dossiers du projet.

---

## 📥 Téléchargement des outils externes

Tu dois créer deux dossiers :

```
ffmpeg/
yt-dlp/
```

Et y placer les exécutables correspondants **selon ton OS**.

Le serveur détecte automatiquement Windows/Linux/macOS et utilise :

| OS | Nom des fichiers |
|----|-------------------|
| Windows | `ffmpeg.exe`, `ffprobe.exe`, `yt-dlp.exe` |
| Linux/macOS | `ffmpeg`, `ffprobe`, `yt-dlp` |

> 🔧 Sous Linux/macOS, les permissions d’exécution (`chmod +x`) sont appliquées automatiquement au démarrage.

---

## 📥 1. Télécharger yt-dlp

### Lien officiel :
https://github.com/yt-dlp/yt-dlp/releases

Télécharge le bon fichier :

| OS | Fichier |
|----|----------|
| Windows | `yt-dlp.exe` |
| Linux | `yt-dlp` |
| Mac | `yt-dlp_macos` (renomme-le en `yt-dlp`) |

Place-le dans :

```
yt-dlp/yt-dlp(.exe)
```

---

## 📥 2. Télécharger ffmpeg + ffprobe

Source recommandée :

https://www.gyan.dev/ffmpeg/builds/

Télécharge :

- Windows : `ffmpeg-release-essentials.zip`
- Linux/macOS : builds statiques FFmpeg (ex. https://www.johnvansickle.com/ffmpeg/)

Récupère :

- `ffmpeg(.exe)`
- `ffprobe(.exe)`

Place-les dans :

```
ffmpeg/ffmpeg(.exe)
ffmpeg/ffprobe(.exe)
```

---

## 📂 Arborescence attendue

```
YOUTUBE-DOWNLOADER/
 ├─ index.js
 ├─ package.json
 ├─ ffmpeg/
 │   ├─ ffmpeg(.exe)
 │   └─ ffprobe(.exe)
 ├─ yt-dlp/
 │   └─ yt-dlp(.exe)
 ├─ downloads/
 └─ merged/
```

> Les dossiers `downloads/` et `merged/` sont créés automatiquement au démarrage s’ils n’existent pas.

---

## 📦 Installation du projet

Dans le dossier du projet :

```bash
npm install
```

---

## ▶️ Lancement

```bash
node index.js
```

Le serveur démarre sur :

```
http://localhost:3000
```

---

## 🌐 Routes disponibles

### 1. `GET /`

Page HTML minimaliste permettant :

- De saisir une URL YouTube 🎬
- De lancer le téléchargement
- De voir l'étape en cours
- De suivre la progression en temps réel
- De télécharger le fichier final

---

### 2. `GET /progress`

SSE (Server-Sent Events) envoyant la progression :

```json
{
  "step": "Téléchargement vidéo",
  "percent": 42
}
```

---

### 3. `POST /download`

Déclenche le téléchargement :

#### Body JSON

```json
{
  "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX"
}
```

#### Fonctionnement interne

1. yt-dlp → téléchargement **bestvideo**
2. yt-dlp → téléchargement **bestaudio**
3. ffmpeg → fusion sans ré-encodage (`-c:v copy`, `-c:a copy`)
4. SSE → mise à jour progression
5. Le fichier final est stocké dans `merged/`

#### Réponse :

```json
{
  "file": "/chemin/vers/merged/<id>.mp4",
  "downloadUrl": "/file?path=/chemin/vers/merged/<id>.mp4"
}
```

---

## 🗂 Dossiers

| Dossier | Contenu |
|--------|----------|
| `downloads/` | Vidéos/audio temporaires |
| `merged/` | Fichiers finaux `.mp4` |
| `ffmpeg/` | Binaires ffmpeg + ffprobe |
| `yt-dlp/` | Binaire yt-dlp |

---

## 🛠 Notes techniques

- Aucune dépendance externe : ffmpeg & yt-dlp ne doivent pas être installés sur la machine
- Compatible :
  - Windows 💠
  - Linux 🐧
  - macOS 🍎
- Le serveur applique automatiquement les permissions d’exécution sous Linux/macOS
- La progression yt-dlp est extraite via un regex

---

## ✅ Pistes d'amélioration

- Nettoyage automatique de `downloads/`
- Utiliser le **titre YouTube** pour nommer le fichier final
- Téléchargements simultanés via une file d’attente
- Interface web plus jolie

---