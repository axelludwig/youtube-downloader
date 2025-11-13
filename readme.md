# YouTube Downloader (Node.js + yt-dlp + ffmpeg)

Petit serveur Node.js pour :

- Télécharger la **meilleure vidéo** YouTube
- Télécharger la **meilleure piste audio**
- **Fusionner** les deux en un seul fichier `.mp4`
- Suivre l’**avancement en direct** (téléchargement + fusion) via une barre de progression sur une page web

---

## 🧩 Prérequis

- **Node.js** (version 18+ recommandée)
- **yt-dlp** (binaire Windows)
- **ffmpeg** (binaire Windows avec `ffmpeg.exe` et `ffprobe.exe`)

---

## 📥 Téléchargement des outils externes

### 1. yt-dlp (Windows)

1. Va sur la page des releases GitHub de yt-dlp :  
   <https://github.com/yt-dlp/yt-dlp/releases> :contentReference[oaicite:0]{index=0}  
2. Clique sur la dernière version stable.
3. Dans la section **Assets**, télécharge le fichier :

   - `yt-dlp.exe` (binaire Windows autonome)

4. Place ce fichier **à la racine du projet**, à côté de `index.js` et `package.json`.

Arborescence attendue :

```text
YOUTUBE-DOWNLOADER/
 ├─ index.js
 ├─ package.json
 ├─ yt-dlp.exe        ← ici
 ├─ ffmpeg/
 ├─ downloads/
 └─ merged/
```

---

### 2. ffmpeg (Windows)

Il te faut une build Windows contenant **ffmpeg.exe** et **ffprobe.exe**.

#### Source recommandée (gyan.dev)

1. Va sur : <https://www.gyan.dev/ffmpeg/builds/> :contentReference[oaicite:1]{index=1}  
2. Télécharge l’archive **release essentials** (suffisant pour ce projet), typiquement :

   - `ffmpeg-release-essentials.zip` ou `ffmpeg-release-essentials.7z`

3. Extrais l’archive.
4. Récupère au minimum :

   - `ffmpeg.exe`
   - `ffprobe.exe`

5. Crée un dossier `ffmpeg` à la racine du projet et copie ces deux fichiers dedans.

Arborescence attendue :

```text
YOUTUBE-DOWNLOADER/
 ├─ ffmpeg/
 │   ├─ ffmpeg.exe     ← ici
 │   └─ ffprobe.exe    ← ici
 ├─ yt-dlp.exe
 ├─ index.js
 ├─ package.json
 ├─ downloads/
 └─ merged/
```

> ℹ️ Tu peux aussi passer par la page officielle de FFmpeg, qui renvoie vers des builds Windows, notamment gyan.dev. :contentReference[oaicite:2]{index=2}

---

## 📦 Installation du projet

Dans le dossier du projet :

```bash
npm install
```

Les dossiers `downloads` et `merged` sont créés automatiquement au démarrage si besoin.

---

## ▶️ Lancement

```bash
node index.js
```

Le serveur démarre sur :

```text
http://localhost:3000
```

---

## 🌐 Routes disponibles

### 1. `GET /`

Page HTML minimaliste avec :

- Un champ texte pour coller une URL YouTube
- Un bouton **“Télécharger”**
- L’affichage de l’**étape actuelle** (`Téléchargement vidéo`, `Téléchargement audio`, `Fusion vidéo/audio`, etc.)
- Une **barre de progression** qui suit :
  - le téléchargement vidéo
  - le téléchargement audio
  - la fusion FFmpeg
- Une zone `<pre>` qui affiche la réponse JSON de l’API `/download`

---

### 2. `GET /progress`

- Type : **Server-Sent Events (SSE)**
- Utilisé par la page HTML pour recevoir en temps réel l’état courant :

```json
{
  "step": "Téléchargement vidéo",
  "percent": 42
}
```

La page se connecte automatiquement à cette route avec :

```js
const evt = new EventSource("/progress");
```

---

### 3. `POST /download`

Lance le téléchargement et la fusion.

- **URL :** `/download`
- **Méthode :** `POST`
- **Headers :** `Content-Type: application/json`
- **Body JSON :**

```json
{
  "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX"
}
```

**Fonctionnement interne :**

1. yt-dlp télécharge la meilleure **piste vidéo** (`bestvideo`) dans `downloads/<id>_video.mp4`.
2. yt-dlp télécharge la meilleure **piste audio** (`bestaudio`) dans `downloads/<id>_audio.m4a`.
3. ffmpeg fusionne vidéo + audio en un fichier final dans `merged/<id>.mp4`.
4. La progression de chaque étape est envoyée sur `/progress`.

**Réponse (succès) :**

```json
{
  "file": "C:\\chemin\\vers\\le\\projet\\merged\\<id>.mp4"
}
```

**Réponse (erreur) :**

```json
{
  "error": "Erreur",
  "details": "Message d'erreur détaillé"
}
```

---

## 🗂 Dossiers utilisés

- `downloads/`  
  Vidéo seule & audio seul téléchargés par yt-dlp (fichiers temporaires).

- `merged/`  
  Fichiers finaux `.mp4` (vidéo + audio fusionnés).

- `ffmpeg/`  
  Contient `ffmpeg.exe` et `ffprobe.exe` utilisés par `fluent-ffmpeg`.

- `yt-dlp.exe`  
  Binaire yt-dlp Windows utilisé via `execFile`.

---

## 🛠 Notes techniques

- La fusion est faite avec :

  ```text
  -c:v copy
  -c:a copy
  ```

  → pas de ré-encodage, donc :

  - très rapide
  - aucune perte de qualité

- La progression de yt-dlp est lue à partir de sa sortie console (`stdout` / `stderr`) grâce à un regex qui repère des lignes du type :

  ```text
  [download]  12.3% of 50.0MiB at 2.5MiB/s ETA 00:18
  ```

  et envoyée en temps réel aux clients via SSE sur `/progress`.

---

## ✅ Pistes d’amélioration

- Ajouter un bouton **“Télécharger la vidéo finale”** directement depuis l’interface (via une route `/file?path=...` par exemple).
- Renommer le fichier dans `merged/` avec le **titre YouTube**.
- Supprimer automatiquement les fichiers temporaires dans `downloads/`.
- Gérer une **file d’attente** pour plusieurs téléchargements en parallèle.