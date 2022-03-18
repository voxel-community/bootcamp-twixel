# Routes

| Capitolo precedente  | Capitolo successivo     |
| :--------------- | ---------------: |
| [◀︎ 02-esplora-struttura-progetto](../02-esplora-struttura-progetto)| [04-database ▶︎](../04-database) |


Un sito web è formato da pagine. La prima cosa da fare, dunque, è preparare la struttura delle pagine. Questa è la struttura che avranno dentro Twixel:


* `/` per la homepage
* `/twixes` per visualizzare la lista di tutti i twix
* `/twixes/:twixId` per visualizzare un twix specifico
* `/twixes/new` per creare un nuovo twix
* `/login` per accedere al proprio account

Si possono creare le pagine tramite [`remix.config.js`](https://remix.run/docs/en/v1.3.2-pre.0/api/conventions#remixconfigjs), ma il modo più comune e semplice per creare la nostra struttura delle pagine è attraverso il file system, ovvero usando una struttura di cartelle e file. **Questo sistema è chiamato "`file-based routing`"**.

Ogni file che creiamo nella cartella `app/routes` viene chiamato ["Route Module"](https://remix.run/docs/en/v1.3.2-pre.0/api/conventions#route-module-api) e seguendo una [convenzione nel rinominare i file](https://remix.run/docs/en/v1.3.2-pre.0/api/conventions#file-name-conventions), possiamo creare gli URL e i link che rispettano la struttura che vogliamo creare. 

Le pagine del sito web vanno collegate tra loro per funzionare - Remix si basa su [React Router](https://reactrouter.com/) per gestire il sistema di collegamento tra le varie pagine dell'applicazione, rendendo il processo rapido e automatico.

## Pagina iniziale

💿 Iniziamo creando la pagina iniziale, quella raggiungibile tramite (`/`). Per farlo, crea un file `app/routes/index.tsx` e con `export default` esporta un funzione contenente la nostra pagina in formato `HTML`. Per adesso puoi far visualizzare quello che desideri, noi nell'esempio abbiamo voluto visualizzare **"Hello Index Route"**.

<details>

<summary>app/routes/index.tsx</summary>

```tsx filename=app/routes/index.tsx
export default function IndexRoute() {
  return <div>Hello Index Route</div>;
}
```

</details>

React Router supporta il **`nested routing`**, che significa che possiamo avere pagine e sottopagine nei nostri link. Ad esempio `app/routes/index.tsx` è una sottopagina di `app/root.tsx`. Nel nested routing, le pagine "genitore" sono responsabili della gestione e visualizzazione delle proprie pagine "figli" o sottopagine.

💿 Aggiorna `app/root.tsx` per posizionare la sottopagina. Puoi farlo utilizzando il componente `<Outlet />` che ti viene fornito da `remix`. Quando metti un `<Outlet />`, stai dicendo alla pagina di visualizzare in quello spazio tutte le sue sotto-pagine

<details>

<summary>app/root.tsx</summary>

```tsx filename=app/root.tsx lines=[1,11]
import { LiveReload, Outlet } from "remix";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Remix: So great, it's funny!</title>
      </head>
      <body>
        <Outlet />
        <LiveReload />
      </body>
    </html>
  );
}
```

</details>

💿 Avviamo il server di sviluppo con il comando `npm run dev`. Questo comando permetterà all'applicazione di "ascoltare" i cambiamenti ai file, ricostruire il sito e grazie al componente `<LiveReload />`, permettere al tuo browser di ricaricarsi e visualizzare le pagine aggiornate.

💿 Apri il sito e dovresti visualizzare il messaggio che hai inserito:

![Index](/assets/03/hello-world.png)

## Lista dei twixes

Ottimo! Ora gestiamo la pagina `/twixes`.

💿 Crea un nuovo file `app/routes/twixes.tsx` (ricordati che questa è una pagina "genitore" quindi vorrai usare `<Outlet />` di nuovo).

<details>

<summary>app/routes/twixes.tsx</summary>

```tsx filename=app/routes/twixes.tsx
import { Outlet } from "remix";

export default function TwixesRoute() {
  return (
    <div>
      <h1>Twixes 💬</h1>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

</details>

Ora dovresti vedere il codice che hai appena scritto visitando la pagina [`/twixes`](http://localhost:3000/twixes). Adesso al posto di `<Outlet />` vogliamo visualizzare alcuni random twixes.

Per visualizzare correttamente le pagine nell'`<Outlet />`, il nome della pagina contenente l'`<Outlet />` e il nome della cartella contenente le sotto pagine che vuoi visualizzare dentro l'`<Outlet />` devono essere identici. 

Dunque, per visualizzare la lista di Twixes nell'`<Outlet />` dentro la pagina `twixes.tsx`, dobbiamo creare una cartella `/twixes` contenente una pagina, a esempio `index.tsx`.

💿 Crea un file `app/routes/twixes/index.tsx`

<details>

<summary>app/routes/twixes/index.tsx</summary>

```tsx filename=app/routes/twixes/index.tsx
export default function TwixesIndexRoute() {
  return (
    <div>
      <p>Qui c'è un twix random:</p>
      <p>
        I was wondering why the frisbee was getting bigger,
        then it hit me.
      </p>
    </div>
  );
}
```

</details>

Adesso se ricarichi la pagina [`/twixes`](http://localhost:3000/twixes), vedrai che sarà visualizzato sia il contenuto dal file `app/routes/twixes.tsx` che quello `app/routes/twixes/index.tsx`. Il risultato dovrebbe essere simile a questo:

![Twix index](/assets/03/twixes.png)

Come puoi notare, ogni pagina corrisponde al proprio pezzettino di URL. Avere questa gestione a file e cartelle per le pagine permette di avere un ottimo sistema per gestire pagine e sottopagine!

## Pagina di creazione nuovo twix

💿 Ora occupiamoci della pagina di creazione di un twix `/twixes/new`. Forse adesso avrai capito come creare una pagina che venga visualizzata all'url http://localhost:3000/twixes/new. Ricorda che in questa pagina permetteremo agli utenti di creare dei twix, quindi quello che vuoi visualizzare è un `form` con dei campi per `titolo` e `contenuto`.

<details>

<summary>app/routes/twixes/new.tsx</summary>

```tsx filename=app/routes/twixes/new.tsx
export default function NewTwixRoute() {
  return (
    <div>
      <p>Add your own hilarious twix</p>
      <form method="post">
        <div>
          <label>
            Titolo: <input type="text" name="title" />
          </label>
        </div>
        <div>
          <label>
            Contenuto: <textarea name="content" />
          </label>
        </div>
        <div>
          <button type="submit" className="button">
            Aggiungi
          </button>
        </div>
      </form>
    </div>
  );
}
```

</details>

Ottimo, ora andando al link [`/twixes/new`](http://localhost:3000/twixes/new) dovresti vedere il seguente form:

![A new twix form](/assets/03/twixes-new.png)

Per ora anche se riempi i campi e clicchi i pulsanti, non succede nulla. Abbiamo solo creato la struttura HTML, mancano ancora le logiche di funzionamento e il collegamento con il database - nelle prossime pagine scoprirai come fare!

## Pagina di dettaglio di un twix

Nei prossimi capitoli creeremo e salveremo i nostri twix su un database tramite ID. Dunque anche se la pagina sarà la stessa come struttura, il suo contenuto cambierà ogni volta sulla base dell'ID presente nell'URL. 

Per fare ciò useremo i parametri URL. Quindi aggiungiamo una nuova pagina per visualizzare il singolo twix conoscendo il suo id: 

`/twixes/$twixId`

Il parametro `$twixId` nel nome del file può essere qualsiasi cosa - dato che ha il `$` davanti, stiamo dicendo a Remix che il nome di quella pagina non sarà sempre fisso come quello di `twixes`, ma potrà essere qualunque cosa, a esempio `19874713` oppure `twixel-434324`.

Grazie alla presenza di questo paramtetro, noi possiamo utilizzarlo nella nostra pagina per cercare all'interno del nostro database questa parte di URL e mostrare il twix corrispondente. Per creare una pagina con dei parametri dinamici, quando crei il file basta usare`$`. ([Scopri di più su questa convenzione qui](https://remix.run/docs/en/v1.3.2-pre.0/api/conventions#file-name-conventions)).

💿 Crea una nuova pagina `app/routes/twixes/$twixId.tsx`. Intanto non preoccuparti di cosa verrà visualizzato navigando a questa pagina (non abbiamo ancora fatto il setup del nostro database):

<details>

<summary>app/routes/twixes/$twixId.tsx</summary>

```tsx filename=app/routes/twixes/$twixId.tsx
export default function TwixRoute() {
  return (
    <div>
      <p>Here's your hilarious twix:</p>
      <p>
        Why don't you find hippopotamuses hiding in trees?
        They're really good at it.
      </p>
    </div>
  );
}
```

</details>

Ottimo ora andando al link [`/twixes/quello-che-vuoi`](http://localhost:3000/twixes/test) dovresti visualizzare il contenuto del file che hai appena creato:

![A new twix form](/assets/03/random-twix.png)

Fantastico! Abbiamo appena creato tutte le principali pagine dell'applicazione. Manca solo la pagina di login ma di quella ci occuperemo quando faremo l'autenticazione.

| Capitolo precedente  | Capitolo successivo     |
| :--------------- | ---------------: |
| [◀︎ 02-esplora-struttura-progetto](../02-esplora-struttura-progetto)| [04-database ▶︎](../04-database) |