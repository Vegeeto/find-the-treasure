# Find the Treasure
# Especificació funcional i tècnica
## Aplicació del joc de coordenades

## 1. Objectiu

Crear una aplicació web estàtica, responsive i en català per un joc relacionat amb un casament.

L’aplicació ha de permetre:

1. Seleccionar la taula de l’equip.
2. Introduir una latitud i una longitud mitjançant dos inputs independents.
3. Validar la combinació de coordenades segons la configuració de la taula.
4. Gestionar tres intents per equip.
5. Permetre restablir els intents mitjançant un codi privat de l’organització.
6. Mostrar l’enigma quan la coordenada sigui correcta.
7. Validar la resposta de l’enigma i desbloquejar una paraula.
8. Permetre introduir la frase final.
9. Mostrar el missatge de tresor desbloquejat al primer equip que l’introdueixi correctament.

La mesa presidencial **Vienna** no participa i no apareix com a opció de selecció.

## 2. Stack obligatori

El projecte ha de ser un lloc web estàtic, sense procés de build complex.

- HTML5 semàntic.
- CSS3 amb Custom Properties.
- Vanilla JavaScript per a la lògica i configuració.
- Alpine.js per a interactivitat, estat i data binding.
- AOS per a animacions d’entrada i transicions suaus.
- Font Awesome per a icones.
- Imatges WebP optimitzades si s’utilitzen imatges.
- No utilitzar frameworks pesants ni backend obligatori.
- No exigir npm, bundler o compilació per poder obrir el projecte.

Les dependències es poden carregar mitjançant CDN o deixar documentada una opció local per a ús offline.

## 3. Arquitectura de fitxers

Proposta mínima:

```text
/
├── index.html
├── app.js
├── styles.css
├── config.js
├── README.md
├── assets/
│   ├── logo.webp
│   ├── map.webp
│   └── landmarks/
│       ├── vienna.webp
│       ├── france.webp
│       ├── italia.webp
│       ├── mexico.webp
│       ├── jordan.webp
│       └── egypt.webp
└── icons/
```

La configuració del joc ha d’estar separada de la lògica i les vistes.

- `config.js`: taules, coordenades correctes, enigmes, respostes, paraules, codis de reset i frase final.
- `app.js`: estat, validacions, navegació de fases i funcions del joc.
- `index.html`: contenidor de la vista i plantilles HTML renderitzades amb Alpine.js.
- `styles.css`: tema visual, responsive, estats d’error/èxit i animacions.

## 4. Principi de configurabilitat

Cap dada del joc ha d’estar escrita directament dins de la lògica de validació.

La lògica ha de llegir-ho tot des de `GAME_CONFIG` a `config.js`.

Exemple:

```js
const GAME_CONFIG = {
  app: {
    language: 'ca',
    title: 'El nostre viatge',
    date: '11 d’octubre de 2026',
    maxAttempts: 3,
    resetEnabled: true,
    allowRepeatedReset: true,
    finalPhrase: 'COMPARTIR CAMINS CREA RECORDS INOBLIDABLES',
    finalPhraseWords: [
      'COMPARTIR',
      'CAMINS',
      'CREA',
      'RECORDS',
      'INOBLIDABLES'
    ]
  },
  tables: {
    france: {
      id: 'france',
      label: 'FRANCE',
      icon: 'fa-solid fa-tower-observation',
      landmarkImage: 'assets/landmarks/france.webp',
      latitudeOptions: [],
      longitudeOptions: [],
      validCoordinate: {
        latitude: null,
        longitude: null
      },
      riddle: '...',
      riddleAnswer: 'COMPARTIR',
      unlockedWord: 'COMPARTIR',
      resetCode: 'F-7KQ'
    }
  }
};
```

Els exemples anteriors són de mostra i s’han de substituir per les coordenades definitives i codis secrets.

## 5. Fases de l’aplicació

### Fase 0 — Pantalla d’inici

Mostrar:

```text
ESTHER & ORIOL

EL NOSTRE VIATGE

11 D’OCTUBRE DE 2026
```

Incloure un botó:

```text
COMENÇAR
```

Text opcional:

```text
Una missió per taules, cinc paraules i un tresor final.
```

### Fase 1 — Selecció de taula

Pregunta exacta:

```text
DE QUINA TAULA SOU?
```

Opcions visibles:

- FRANCE.
- ITALIA.
- MÉXICO.
- JORDAN.
- EGYPT.

No mostrar Vienna.

Quan l’equip selecciona una taula:

- Carregar les opcions de latitud i longitud d’aquella taula.
- Inicialitzar o recuperar el seu estat.
- Mostrar el nom i la il·lustració corresponents.
- Passar a la fase de coordenades.

### Fase 2 — Coordenades

La pantalla ha de tenir exactament dos inputs independents:

```text
LATITUD
[ seleccionar o introduir valor ]

LONGITUD
[ seleccionar o introduir valor ]
```

Botó:

```text
COMPROVAR COORDENADA
```

També mostrar:

```text
INTENTS RESTANTS: 3
```

La combinació s’ha de validar sempre com:

```js
(latitude, longitude)
```

La latitud és el primer valor i la longitud el segon. No invertir-los internament.

Recomanació d’interfície: utilitzar dos camps select o botons seleccionables amb valors preconfigurats per evitar errades d’escriptura, però mantenir-los visualment com dos inputs separats.

### Error de coordenades

Quan la combinació sigui incorrecta:

- Restar un intent.
- No indicar si l’error és la latitud o la longitud.
- Mantenir visibles les opcions.
- Mostrar un missatge amable.

Text:

```text
AQUESTA COORDENADA NO ÉS LA CORRECTA

Torneu-ho a provar.
```

Si encara queden intents:

```text
INTENTS RESTANTS: [X]
```

### Coordinada correcta

Quan la combinació coincideixi amb la configuració:

- Marcar la fase de coordenades com completada.
- Guardar la validació.
- Bloquejar nous intents de coordenades.
- Mostrar una transició d’èxit.
- Passar a l’enigma.

Text:

```text
COORDENADA VALIDADA

El vostre viatge continua.
```

### Fase 3 — Enigma

Mostrar l’enigma específic de la taula.

Els enigmes han de ser frases enunciatives, no preguntes.

#### France — COMPARTIR

```text
Quan un camí es viu en companyia, deixa de ser només d’una persona i es converteix en una experiència per compartir.
```

#### Italia — CAMINS

```text
No són només carreteres: poden portar-nos lluny, apropar-nos o canviar-nos.
```

#### México — CREA

```text
Cada viatge compartit transforma una experiència en una història i una història en un record.
```

#### Jordan — RECORDS

```text
No caben en una maleta, però viatgen amb nosaltres durant anys. Poden tornar amb una olor, una cançó o una imatge.
```

#### Egypt — INOBLIDABLES

```text
Alguns moments passen ràpidament, però deixen una petjada que el temps no aconsegueix esborrar.
```

L’aplicació ha d’incloure un input per introduir la resposta i un botó:

```text
DESBLOQUEJAR PARAULA
```

La resposta correcta es llegeix des de `config.js`.

Normalització recomanada:

- Convertir a majúscules.
- Retallar espais inicials i finals.
- Reduir espais dobles.
- Opcionalment, acceptar accents omesos només si es defineixen explícitament a la configuració.
- No acceptar sinònims automàticament.

### Resposta correcta de l’enigma

Mostrar:

```text
PARAULA DESBLOQUEJADA

[PARAULA]

Guardeu-la bé. La necessitareu per obrir el tresor final.
```

Guardar el progrés de la taula i permetre passar a la fase final.

### Resposta incorrecta

```text
AQUESTA NO ÉS LA PARAULA CORRECTA

Torneu a llegir l’enigma amb calma.
```

No consumir intents de coordenades en aquesta fase.

## 6. Sistema de reset

Quan `attemptsRemaining` arribi a zero durant la fase de coordenades:

```text
ELS TRES INTENTS S’HAN ESGOTAT

La ruta encara us espera.

Demaneu el codi de l’organització per continuar el viatge.
```

Mostrar un input de codi i botó:

```text
CODI DE DESBLOQUEIG
[______________]

RESTAURAR INTENTS
```

El codi es llegeix des de `config.js` segons la taula seleccionada.

Si el codi és correcte:

- Restablir `attemptsRemaining` a `maxAttempts`.
- Mantenir la fase de coordenades.
- No revelar la combinació correcta.
- No eliminar cap altre progrés.
- Permetre un altre reset si `allowRepeatedReset` és `true`.

Text d’èxit:

```text
ELS INTENTS S’HAN RESTABLERT

Ara podeu continuar.
```

Text d’error:

```text
EL CODI NO ÉS VÀLID
```

Els codis no han d’aparèixer mai en pantalla pública ni en les targetes dels convidats.

## 7. Fase de frase final

Quan una taula resolgui el seu enigma, la seva paraula quedarà disponible.

La frase final configurable és:

```text
COMPARTIR CAMINS CREA RECORDS INOBLIDABLES
```

Paraules per taula:

- France → COMPARTIR.
- Italia → CAMINS.
- México → CREA.
- Jordan → RECORDS.
- Egypt → INOBLIDABLES.

La pantalla ha de permetre introduir la frase completa, o seleccionar/ordenar les cinc paraules.

Text:

```text
REUNIU LES CINC PARAULES

Introduïu la frase que desbloquejarà el tresor.
```

Normalitzar l’entrada abans de validar:

- Majúscules/minúscules indiferents.
- Espais múltiples indiferents.
- Retallar espais inicials i finals.
- No acceptar paraules en un ordre diferent.

Si és correcta:

```text
TRESOR DESBLOQUEJAT

COMPARTIR CAMINS CREA RECORDS INOBLIDABLES

Aneu a trobar l’Esther i l’Oriol.
```

Registrar localment el moment de desbloqueig i mostrar un identificador de confirmació si cal.

## 8. Estat de l’aplicació

L’estat mínim per taula:

```js
{
  selectedTable: null,
  phase: 'table-selection',
  attemptsRemaining: 3,
  coordinateValidated: false,
  riddleSolved: false,
  unlockedWord: null,
  finalPhraseUnlocked: false
}
```

Per a una web estàtica, es pot persistir amb `localStorage`.

Clau recomanada:

```text
boda-viaje-game-state
```

L’estat ha de ser independent per cada taula, però cal valorar el risc que diversos equips comparteixin el mateix dispositiu. Per aquest motiu, la selecció de mesa ha de començar una sessió separada i la configuració pot utilitzar un identificador de sessió generat en entrar.

## 9. Consideració sobre static hosting

Una aplicació purament estàtica no pot garantir de forma segura quin equip ha estat el primer entre dispositius diferents si només utilitza `localStorage`, perquè cada navegador té el seu propi estat.

Per tant, cal decidir una de les dues opcions:

### Opció simple, sense backend

- Cada dispositiu valida localment.
- Quan un equip veu “tresor desbloquejat”, ho comunica als nuvis.
- La persona responsable comprova la frase.
- És suficient per una activitat informal.

### Opció amb validació compartida

- Utilitzar un servei extern o backend lleuger per registrar el primer desbloqueig.
- Requereix connexió i configuració addicional.
- No és necessària per al prototip estàtic.

Recomanació inicial: desenvolupar primer l’opció estàtica local i fer que el primer equip comuniqui la frase als nuvis. Si es vol control automàtic, afegir després un backend o servei de dades.

## 10. Alpine.js

Utilitzar Alpine.js per:

- Gestionar la pantalla actual.
- Fer el binding dels inputs.
- Mostrar o ocultar blocs de cada fase.
- Gestionar missatges d’error i èxit.
- Actualitzar intents i estat.
- Activar estats de càrrega.

Exemple conceptual:

```html
<div x-data="gameApp()">
  <template x-if="phase === 'table-selection'">
    <!-- Selecció de taula -->
  </template>

  <template x-if="phase === 'coordinates'">
    <!-- Inputs de latitud i longitud -->
  </template>

  <template x-if="phase === 'riddle'">
    <!-- Enigma -->
  </template>

  <template x-if="phase === 'final-phrase'">
    <!-- Frase final -->
  </template>
</div>
```

## 11. Vanilla JavaScript

Implementar en JavaScript:

- Lectura de `GAME_CONFIG`.
- Selecció de taula.
- Càrrega de dades configurables.
- Comparació de latitud i longitud.
- Control d’intents.
- Normalització de respostes.
- Validació del codi de reset.
- Persistència local.
- Gestió de la frase final.

No duplicar la lògica per taula. Totes les taules han de funcionar amb la mateixa funció i dades diferents.

## 12. AOS

Utilitzar AOS de manera discreta per a:

- Entrada de la capçalera.
- Aparició de les opcions de taula.
- Entrada dels camps de coordenades.
- Transició a l’enigma.
- Aparició de la paraula desbloquejada.
- Pantalla final del tresor.

No fer que les animacions dificultin la lectura o la interacció en mòbil.

## 13. Tema visual

Utilitzar CSS Custom Properties:

```css
:root {
  --color-paper: #f5f0e8;
  --color-ink: #313438;
  --color-muted: #7c8582;
  --color-sage: #aebbb0;
  --color-sand: #d8c4a6;
  --color-accent: #b77f6e;
  --color-success: #6f8b78;
  --color-error: #a66d68;
  --shadow-soft: 0 12px 30px rgba(49, 52, 56, .10);
}

[data-theme='dark'] {
  --color-paper: #222426;
  --color-ink: #f3eee5;
  --color-muted: #b7beb9;
  --color-sage: #879b90;
  --color-sand: #b69e7a;
  --color-accent: #c58b7a;
  --color-success: #91b49b;
  --color-error: #d08d86;
}
```

Afegir un control de tema opcional, però mantenir el tema clar com a predeterminat perquè coincideixi amb la papereria de la boda.

## 14. Accessibilitat i responsive

- [ ] Disseny mobile-first.
- [ ] Botons grans i fàcils de tocar.
- [ ] Contrast suficient entre text i fons.
- [ ] Labels visibles per a latitud i longitud.
- [ ] No dependre únicament del color per indicar errors o èxits.
- [ ] Navegació amb teclat.
- [ ] `aria-live` per als missatges d’estat.
- [ ] Text alternatiu per a les imatges WebP.
- [ ] Inputs amb `autocomplete="off"` si es considera necessari.
- [ ] Evitar efectes de moviment excessius.

## 15. Criteris d’acceptació

L’aplicació estarà preparada quan:

- [ ] Es pugui obrir com a web estàtica sense build.
- [ ] La primera pantalla demani la taula.
- [ ] Vienna no aparegui com a opció.
- [ ] La selecció de taula carregui una configuració independent.
- [ ] Hi hagi dos inputs separats: latitud i longitud.
- [ ] La latitud i la longitud es validin com una parella.
- [ ] Hi hagi tres intents inicials.
- [ ] Cada error redueixi un intent.
- [ ] En esgotar-los aparegui el reset amb codi.
- [ ] El reset restauri els intents sense reiniciar la partida.
- [ ] La combinació correcta desbloquegi només l’enigma de la taula seleccionada.
- [ ] Els enigmes es llegeixin des de la configuració.
- [ ] La resposta correcta desbloquegi la paraula configurada.
- [ ] La frase final sigui configurable.
- [ ] El primer equip pugui veure el missatge de tresor desbloquejat.
- [ ] Tot el text visible estigui en català.
- [ ] La configuració es pugui modificar sense tocar la lògica principal.
- [ ] AOS, Alpine.js i Font Awesome funcionin correctament.
- [ ] El tema clar sigui coherent amb la papereria de la boda.
- [ ] L’aplicació sigui usable en mòbil.

## 16. Decisions pendents

- [ ] Confirmar el format exacte dels valors de latitud i longitud.
- [ ] Decidir si els inputs seran `select` o camps editables amb valors suggerits.
- [ ] Definir les coordenades definitives de cada taula.
- [ ] Definir els codis de reset secrets.
- [ ] Decidir si el prototip funcionarà només amb `localStorage`.
- [ ] Decidir si cal registrar automàticament quin equip arriba primer.
- [ ] Crear o seleccionar les imatges WebP.
- [ ] Confirmar les tipografies i l’estil visual final.
