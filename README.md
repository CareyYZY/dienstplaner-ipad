# Dienstplaner (iPad)

Dienstplan, Urlaubsplan und Aufgaben für die Metzgerei – als **Web-App fürs iPad**. Sie läuft komplett im Browser, funktioniert **offline** und speichert alle Daten **lokal auf dem Gerät**. Es gibt keinen Server und keine Cloud.

Diese App ist eine eigenständige Version des Windows-Programms „Dienstplaner“ (Daten werden **nicht** automatisch zwischen beiden abgeglichen).

## Installation auf dem iPad

1. Die Adresse **https://careyyzy.github.io/dienstplaner-ipad/** in **Safari** öffnen.
2. Auf das Teilen-Symbol tippen und **„Zum Home-Bildschirm“** wählen.
3. Die App wie jede andere über das Symbol „Dienstplaner“ starten. Sie läuft im Vollbild und ohne Internet.

## Funktionen

- **Mitarbeiter** mit Wochenstunden, Urlaubstagen, verfügbaren Wochentagen, Farbe und mehreren **Arbeitsbereichen** (mit Farben, die hinter dem Namen erscheinen)
- **Dienstplan** als Tag (Zeitleiste), Woche und Monat; Arbeitszeiten per Antippen anlegen, per Finger verschieben und in der Länge ziehen, automatische Pausen (ab 6 Std. 30 Min., ab 8,5 Std. 45 Min., ab 10 Std. 60 Min.)
- Hinweise: Überschneidung, Ruhezeit (rot hinterlegt bis zur frühestmöglichen Arbeitszeit), Unterbesetzung, mehr als 10 Std., Verfügbarkeit, Abwesenheit
- **✨ Lücken füllen**: Vorschläge, die Verfügbarkeit, Abwesenheit, Ruhezeit und Wochenstunden beachten
- **Urlaubsplan** als Jahresansicht mit Ziehen zum Anlegen und Verschieben, Urlaubstage-Zähler
- **Aufgaben** je Tag, auch wiederkehrend nach Wochentagen, mit Zuständigkeit und Abhaken
- **Drucken** des Wochenplans und des Jahresplans (Querformat, AirPrint oder „Als PDF sichern“)
- Hell-/Dunkelmodus, Regeln (Öffnungszeiten, Ruhezeit, Mindestbesetzung)

## Daten sichern

Alle Daten liegen nur im Speicher der App auf dem iPad. Unter **Einstellungen → Sicherung exportieren** lässt sich eine Datei speichern (z. B. in iCloud Drive) und mit **Sicherung importieren** wieder einspielen, auch auf einem zweiten iPad. Bitte regelmäßig eine Sicherung anlegen.

## Entwicklung

Reines HTML/CSS/JavaScript ohne Build-Schritt und ohne externe Bibliotheken. Zum Testen lokal einen beliebigen Webserver im Ordner starten (z. B. `python3 -m http.server`). Veröffentlicht wird über GitHub Pages (Branch `main`, Ordner `/`).
