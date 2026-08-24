# Guide de Déploiement - YouTube Downloader (Gestion des Erreurs yt-dlp)

## Résumé des Changements

Ce déploiement corrige le crash du bot lors d'erreurs yt-dlp, notamment pour les vidéos YouTube age-restricted.

### Problème Identifié
- Le bot crashait avec `TypeError: Cannot read properties of null` quand yt-dlp échouait
- Les vidéos YouTube age-restricted retournaient : `ERROR: Sign in to confirm your age`
- Aucune gestion d'erreur appropriée pour les autres cas (vidéos supprimées, privées, etc.)

### Solution Implémentée
1. **Détection des erreurs yt-dlp** dans `exec-progress.js` avec codes spécifiques
2. **Support des cookies YouTube** pour débloquer contenus restreints
3. **Gestion d'erreur robuste** dans toutes les routes avec codes HTTP appropriés
4. **Nettoyage des fichiers temporaires** pour économiser l'espace disque

## Étapes de Déploiement

### 1. Mettre à Jour le Code
```bash
# Remplacer les fichiers modifiés
git pull origin main  # ou sync avec votre système de versioning
```

### 2. Configurer les Cookies (Optionnel mais Recommandé)

**Pour YouTube (Vidéos age-restricted) :**
```bash
# 1. Exporter les cookies YouTube
# - Installer extension "Get cookies.txt" (Chrome/Firefox)
# - Visiter https://youtube.com
# - Exporter les cookies

# 2. Placer le fichier
cp cookies_youtube.txt ./cookies/youtube.txt

# 3. Configurer .env
echo "YOUTUBE_COOKIES_PATH=./cookies/youtube.txt" >> .env
```

**Pour Instagram (Requis pour contenu restreint) :**
```bash
echo "INSTAGRAM_COOKIES_PATH=./cookies/instagram.txt" >> .env
```

### 3. Redémarrer l'Application
```bash
# Arrêter l'app actuelle
npm stop  # ou kill le processus

# Redémarrer
npm start  # ou pm2 start ecosystem.config.cjs
```

## Vérification des Modifications

### Tests Recommandés

#### Test 1 : Vidéo YouTube Normale (Doit Fonctionner)
```bash
curl -X POST http://localhost:3000/download/youtube \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtu.be/dQw4w9WgXcQ", "mode": "audio"}'
```

#### Test 2 : Vidéo Age-Restricted (Sans Cookies → Erreur 403)
```bash
curl -X POST http://localhost:3000/download/youtube \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtu.be/6hsDbUgeygo", "mode": "audio"}'
  
# Réponse attendue:
# {
#   "error": "Contenu réservé",
#   "details": "Cette vidéo est réservée aux utilisateurs connectés...",
#   "code": "AGE_RESTRICTED"
# }
```

#### Test 3 : Vidéo Age-Restricted (Avec Cookies → Doit Fonctionner)
```bash
# (Après configuration YOUTUBE_COOKIES_PATH)
curl -X POST http://localhost:3000/download/youtube \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtu.be/6hsDbUgeygo", "mode": "audio"}'
  
# Réponse attendue:
# {
#   "file": "/path/to/file.mp3",
#   "downloadUrl": "/file?path=...",
#   ...
# }
```

#### Test 4 : Vidéo Supprimée (Erreur 404)
```bash
curl -X POST http://localhost:3000/download/youtube \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtu.be/deleted", "mode": "audio"}'
  
# Réponse attendue:
# {
#   "error": "Vidéo indisponible",
#   "details": "Cette vidéo n'est pas disponible...",
#   "code": "VIDEO_UNAVAILABLE"
# }
```

## Codes d'Erreur

| Code HTTP | Code Erreur | Cas |
|-----------|-------------|-----|
| 403 | `AGE_RESTRICTED` | Vidéo réservée aux connectés |
| 403 | `CONTENT_RESTRICTED` | Contenu inapproprié/restreint |
| 401 | `SESSION_INVALID` | Cookies expirés/invalides |
| 404 | `VIDEO_UNAVAILABLE` | Vidéo supprimée/privée |
| 500 | `YTDLP_ERROR` | Erreur générique yt-dlp |

## Logs et Monitoring

### Logs Importants

```bash
# Vérifier les logs de l'app
tail -f logs/app.log

# Chercher les erreurs yt-dlp
grep -i "Sign in to confirm" logs/app.log
grep -i "AGE_RESTRICTED" logs/app.log

# Vérifier le nettoyage des fichiers temp
grep "Fichiers temporaires supprimés" logs/app.log
```

### Santé de l'Application

```bash
# Vérifier yt-dlp
./libs/yt-dlp/yt-dlp --version

# Vérifier cookies YouTube
ls -la ./cookies/youtube.txt

# Vérifier espace disque (temp/)
du -sh ./temp/
```

## Maintenance

### Mettre à Jour yt-dlp
```bash
# Télécharger la dernière version
cd libs/yt-dlp
# Remplacer le binaire

# Vérifier
./yt-dlp --version
```

### Renouveler les Cookies
Les cookies YouTube/Instagram expirent. Les renouveler mensuellement :
```bash
# Réexporter depuis le navigateur
# Remplacer dans ./cookies/youtube.txt
```

### Nettoyer les Fichiers Temporaires
```bash
# Nettoyer manuellement si besoin
rm -rf temp/downloads/*
rm -rf temp/merged/*  # ATTENTION: contient les vidéos finales!
# Garder seulement les fichiers dans temp/merged/ moins de 24h
find temp/merged -mtime +0 -delete
```

## Rollback

Si des problèmes surviennent :
```bash
# Revenir à la version précédente
git revert HEAD
npm install
npm start
```

## Support et Débogage

Pour déboguer les erreurs :
1. Vérifier les logs : `npm start 2>&1 | tee logs/debug.log`
2. Tester yt-dlp manuellement : `./libs/yt-dlp/yt-dlp "URL"`
3. Vérifier les cookies : `file ./cookies/youtube.txt`
4. Consulter [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp#usage-and-options)
