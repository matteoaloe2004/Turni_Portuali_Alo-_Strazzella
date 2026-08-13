# Port Scheduling - Decision Support System (DSS)

Questo progetto è un **Decision Support System (DSS)** per la pianificazione dei turni dei lavoratori portuali e la risoluzione dei conflitti derivanti da ritardi nell'arrivo delle navi. Il sistema è progettato per ottimizzare l'allocazione delle risorse in tempo reale, garantendo la conformità con le norme contrattuali e di sicurezza.

---

## 🚀 Architettura e Stack Tecnologico

Il sistema è strutturato come un'applicazione web moderna e reattiva:
- **Backend**: .NET 8 con C# ed Entity Framework Core per la gestione del database e il calcolo euristico delle alternative di pianificazione.
- **Frontend**: Vue.js, TypeScript e Vanilla CSS per un'interfaccia utente dinamica, premium e accessibile.
- **Interfaccia Gantt**: Una timeline occupazione operatori interattiva che mostra la distribuzione dei turni nell'arco delle 24 ore per ciascun lavoratore.

---

## 🎯 Criteri di Risoluzione dei Conflitti (Motore DSS)

Quando una nave accumula ritardo o si genera una collisione oraria, il motore decisionale propone la migliore alternativa di riassegnazione scansionando la timeline su una finestra di 7 giorni. Il sistema segue rigorosamente questa **gerarchia di criteri ordinati** (dal meno invasivo all'emergenza estrema):

### 1. Riassegnazione Standard (Stesso giorno, operatore di linea)
* **Descrizione**: Si cerca di mantenere la nave nello stesso giorno. Viene assegnata a un operatore standard (non reperibile) che ha il ruolo richiesto, l'abilitazione specifica per il molo e ore settimanali $\le$ 40h.
* **Slittamento orario**: Se l'orario stimato di arrivo è occupato, il sistema tenta di far slittare il turno in avanti nella stessa giornata (fino al limite delle 21:00/mezzanotte).

### 2. Attivazione Reperibile (Stesso giorno, operatore a chiamata)
* **Descrizione**: Se nessun operatore di linea è disponibile nello stesso giorno, il sistema propone di attivare un operatore **reperibile** (a chiamata) per la stessa giornata, rispettando ruolo, abilitazioni e limite delle 40h.

### 3. Slittamento Temporale (Giorni successivi, <40h)
* **Descrizione**: Se l'arrivo della nave è troppo tardi (es. dopo le 21:00) o non ci sono operatori disponibili, la pianificazione viene fatta slittare nei **giorni successivi** (dal giorno $+1$ al giorno $+6$) a partire dalle ore 07:00.
* Viene data priorità prima agli operatori di linea e poi a quelli a chiamata, sempre nel rispetto di abilitazioni e limite orario.

### 4. Deroga Straordinari (Sforamento limite 40h)
* **Descrizione**: Se non si trovano soluzioni pulite nei 7 giorni, il sistema consente lo sforamento del tetto orario contrattuale degli operatori idonei (prima fino a 60h, poi fino a 80h).

### 5. Deroga Qualifica Banchina
* **Descrizione**: Se necessario, il turno viene assegnato a un operatore con il ruolo corretto ma **senza la specifica abilitazione per quella banchina/molo** (con limite fino a 80h).

### 6. Emergenza Estrema (Qualsiasi operatore)
* **Descrizione**: Come ultima risorsa per garantire che l'utente abbia sempre una soluzione proposta, il sistema assegna il turno a **qualunque operatore disponibile**, ignorando ruolo, abilitazione del molo e limite orario.

### 7. Ultima Risorsa (Nessun vincolo)
* **Descrizione**: Se anche il Criterio 6 non trova una soluzione, il sistema cerca il primo slot libero ignorando ogni vincolo residuo: non solo ruolo, abilitazione e limite orario, ma anche la finestra ETA/ETD della nave, la validità della patente e il riposo obbligatorio. Garantisce che una proposta venga sempre restituita, al prezzo di una soluzione potenzialmente non conforme che il coordinatore deve validare manualmente.

---

## 🔒 Vincoli Logici e Poka-Yoke (Prevenzione Errori)

Il sistema integra controlli rigidi a livello di interfaccia e logica per evitare errori di pianificazione da parte del coordinatore:
- **Limite 40 Ore Settimanali**: Calcolato dinamicamente sulla somma reale dei turni assegnati. In caso di tentativo di sforamento manuale oltre le 40h, il sistema disabilita i pulsanti di assegnazione mostrando il messaggio di errore *"Ore massime superate"*.
- **Poka-Yoke Visivo**:
  - I turni che causano collisioni orarie sono evidenziati con bordi rossi.
  - I turni bloccati o non modificabili sono resi non interattivi per evitare modifiche accidentali.
  - Le righe degli operatori compatibili con il ruolo richiesto lampeggiano delicatamente durante la pianificazione di un task per guidare la scelta del coordinatore.

---


