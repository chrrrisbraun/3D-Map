# Alpine 3D-Wanderkarte

Eigenständige, responsive 3D-Wanderkarten-Anwendung für die Einbindung in Squarespace per iFrame.

## Enthaltene Quelldaten

- `public/models/3d_map.dae`: das bereitgestellte COLLADA-3D-Geländemodell.
- `public/data/routes.json`: die zehn Wanderrouten aus der bereitgestellten RTF-Datei, einschließlich Koordinaten, Kamerapositionen, Beschreibung und Tour-Metadaten.
- `src/main.js`: Three.js-Viewer, Routenvisualisierung, Auswahl und weiche Kamerafahrten.
- `src/style.css`: responsives dunkles Layout.

## Lokal starten

Voraussetzung: Node.js 20.19+ oder 22.12+.

```bash
npm install
npm run dev
```

Vite zeigt danach die lokale Entwicklungsadresse an.

Produktionsbuild:

```bash
npm run build
npm run preview
```

Die fertige statische Website liegt anschließend im Ordner `dist/`.

## Hosting

Du kannst den Inhalt des Repositorys beispielsweise auf GitHub ablegen und mit einem statischen Hosting-Anbieter (z. B. Netlify, Vercel oder eigenem Webserver) veröffentlichen.

- Build command: `npm run build`
- Publish/output directory: `dist`
- Beispiel-Subdomain: `karte.deine-domain.at`

Für einen Unterpfad statt einer eigenen Subdomain muss gegebenenfalls die Vite-`base`-Option in `vite.config.js` gesetzt werden. Eine eigene Subdomain ist die unkomplizierteste Variante.

## Squarespace einbetten

Auf der Squarespace-Seite einen **Code-Block** hinzufügen, den Modus **HTML** wählen und diese Zeile einsetzen. Die URL durch deine veröffentlichte Adresse ersetzen:

```html
<div style="width:100%;height: min(820px, 90vh); min-height: 620px; overflow:hidden;">
  <iframe
    src="https://karte.deine-domain.at"
    title="Interaktive 3D-Wanderkarte"
    loading="lazy"
    allow="fullscreen"
    style="width:100%;height:100%;border:0;"
    allowfullscreen>
  </iframe>
</div>
```

Auf kleinen Displays ggf. `min-height` reduzieren. In Squarespace den Code-Block auf volle Breite stellen.

## Hinweise vor Veröffentlichung

1. Das DAE-Modell wurde übernommen. Es enthält ein Terrain-Mesh, aber keine eingebetteten Bildtexturen. Prüfe die Darstellung im Browser und ergänze bei Bedarf eine passende Terrain-Textur.
2. Die Routenpunkte und Kameraangaben stammen unverändert aus der gelieferten Routendatei. Die Route 3 und Route 7 haben in den Quelldaten eine Distanz von `0m`; die Oberfläche zeigt dafür `–`.
3. Die Quelldatei enthält zehn Routen. Die Routenlinien werden direkt aus den gelieferten 3D-Punkten gezeichnet.
4. Vor dem Livegang sollten alle externen Tour-Links, Bildrechte und die fachliche Routenführung geprüft werden. Die Anwendung zeigt die gelieferten Routendaten an und ersetzt keine aktuelle Weg-/Sicherheitsinformation.
5. Die Anwendung benötigt WebGL und lädt Three.js als npm-Abhängigkeit. Google Fonts werden extern geladen; bei Bedarf können die Fonts lokal eingebunden werden.

## Technischer Aufbau

- Vite für Entwicklung und Build
- Three.js `ColladaLoader` für das DAE-Modell
- `OrbitControls` für Maus-/Touch-Steuerung
- `CatmullRomCurve3` und `LineBasicMaterial` für die Tourlinien
- animierte Kamerafahrt mit Ease-In/Ease-Out beim Tourwechsel
