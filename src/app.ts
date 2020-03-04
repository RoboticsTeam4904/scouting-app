import { v4 as uuidv4 } from 'uuid';

const serverURI = 'ws://127.0.0.1:8000';

interface IAction {
    name: string;
    label: string;
    accent: boolean;
    enabled: boolean;
    effects: Effect[];
}

interface IEvent {
    timestamp: number;
    name: string;
}

interface IGame {
    start_time: number;
    events: IEvent[];
}

type Action = string;
type Stage = string;

interface ITransition {
    kind: 'transition';
    stage: Stage;
}

interface IEnable {
    kind: 'enable';
    actions: Action[];
}

interface IDisable {
    kind: 'disable';
    actions: Action[];
}

interface IEnd {
    kind: 'end';
}

type Effect = ITransition | IEnable | IDisable | IEnd;

interface IStage {
    name: Stage;
    label: string;
    timers: [number, Effect[]][];
    actions: IAction[];
}

interface ISchema {
    stages: IStage[];
    initial: string;
}

class StageUI {
    private start: number;
    private time: Element;
    private element: Element;
    private intervals: ReturnType<typeof setInterval>[];
    private timerIdx: number;

    constructor(stage: IStage, cb: (a0: IAction) => void, tcb: (effects: Effect[]) => void) {
        this.time = document.querySelector('.timer')!;
        this.start = performance.now();
        this.time.classList.add('active');
        this.intervals = [];
        const el = document.createElement('div');
        this.element = el;
        el.classList.add('stage');
        el.innerHTML = `<div class="title">${stage.label}</div>`;
        const actions = document.createElement('div');
        actions.classList.add('actions');
        for (let action of stage.actions) {
            const item = document.createElement('div');
            item.id = action.name;
            item.addEventListener('click', () => { cb(action); });
            item.classList.add('action');
            item.textContent = action.label;
            if (action.accent) {
                item.classList.add('accent');
            }
            if (!action.enabled) {
                item.classList.add('disabled');
            }
            actions.appendChild(item);
        }
        el.appendChild(actions);
        document.body.appendChild(el);
        const sortedTimers = stage.timers.sort((timer1, timer2) => {
            if (timer1[0] < timer2[0]) { return -1; } else if (timer1[0] > timer2[0]) { return 1; } else {
                return 0;
            }
        });
        this.timerIdx = 0;
        let leastTimer;
        if (sortedTimers.length === 0) {
            leastTimer = Infinity;

        } else {
            leastTimer = sortedTimers[this.timerIdx][0];
        }
        if (leastTimer < 60000) {
            this.intervals.push(setInterval(() => {
                const time = performance.now() - this.start;
                const millis = Math.round((time % 1000) / 10).toString().padStart(2, '0');
                const secs = Math.floor(time / 1000).toString().padStart(2, '0');
                this.time.textContent = `${secs}:${millis}`;
                if (sortedTimers[this.timerIdx] && time >= sortedTimers[this.timerIdx][0]) {
                    tcb(sortedTimers[this.timerIdx][1]); this.timerIdx += 1;
                }
            }, 10));
        } else {
            this.intervals.push(setInterval(() => {
                const time = Math.floor((performance.now() - this.start) / 1000);
                const secs = Math.round(time % 60).toString().padStart(2, '0');
                const mins = Math.floor(time / 60).toString().padStart(2, '0');
                this.time.textContent = `${mins}:${secs}`;
                if (sortedTimers[this.timerIdx] && time >= sortedTimers[this.timerIdx][0]) {
                    tcb(sortedTimers[this.timerIdx][1]); this.timerIdx += 1;
                }
            }, 1000));
        }
    }

    public remove() {
        this.element.remove();
        this.time.textContent = '00:00';
        this.time.classList.remove('active');
        for (const interval of this.intervals) {
            clearInterval(interval);
        }
    }
}

enum AppState {
    Uninitialized,
    ReadingSchema,
    Ready,
    Failed,
}

export default class App {
    private initialized: AppState;
    private tempHash: ArrayBuffer;
    private schema: ISchema;
    private ui: StageUI;
    private game: IGame;
    private games: string[];

    constructor() {
        const games = localStorage.getItem('games');
        if (games) {
            this.games = JSON.parse(games);
        } else {
            localStorage.setItem('games', JSON.stringify([]));
            this.games = [];
        }
        const server = new WebSocket(serverURI);
        server.binaryType = 'arraybuffer';
        this.initialized = AppState.Uninitialized;
        server.onerror = () => {
            if (this.initialized !== AppState.Ready) {
                const data = localStorage.getItem('schema');
                if (!data) {
                    const el = document.createElement('div');
                    document.body.appendChild(el);
                    el.outerHTML = `<div style="display: flex; padding: 30px; width: 100vw; height: 100vh; justify-content: center; align-items: center; font-size: 3em; font-weight: bold; flex-flow: column; line-height: 1;"><div>Connection failed<div style="font-size: 0.5em; font-weight: normal; opacity: 0.7; margin-top: 10px;">No schema available</div></div></div>`;
                    this.initialized = AppState.Failed;
                } else {
                    this.read_schema();
                }
            }
        };
        server.onmessage = (message) => {
            if (this.initialized === AppState.Uninitialized) {
                if (message.data !== localStorage.getItem('schema_hash')) {
                    this.initialized = AppState.ReadingSchema;
                    this.tempHash = message.data;
                    server.send('g');
                } else {
                    this.initialized = AppState.Ready;
                    this.read_schema();
                }
            } else if (this.initialized === AppState.ReadingSchema) {
                localStorage.setItem('schema', message.data);
                localStorage.setItem('schema_hash',
                    btoa(String.fromCharCode.apply(null, new Uint8Array(this.tempHash))));
                this.initialized = AppState.Ready;
                this.read_schema();
            }
        };
    }

    private read_schema() {
        const data = localStorage.getItem('schema')!;
        const schema: ISchema = JSON.parse(data);
        this.schema = schema;
        const gs = document.querySelector('.gamestart')!;
        gs.classList.add('active');
        const splash = document.querySelector('.splash');
        splash?.classList.add('loaded');
        setTimeout(() => {
            splash?.remove();
        }, 1000);
        document.querySelectorAll('.start').forEach((item) => {
            item.addEventListener('click', () => { gs.classList.remove('active'); this.begin_game(); });
        });
        // this.begin_game();
    }

    private begin_game() {
        this.game = {
            events: [],
            start_time: Date.now(),
        };
        for (const stage of this.schema.stages) {
            if (stage.name === this.schema.initial) {
                this.ui = new StageUI(stage,
                    (action) => { this.handle_action(action); },
                    (timer) => {
                        this.handle_timer(timer);
                    });
            }
        }
    }

    private transition(schema: string) {
        for (const stage of this.schema.stages) {
            if (stage.name === schema) {
                this.ui.remove();
                this.ui = new StageUI(stage,
                    (action) => { this.handle_action(action); },
                    (timer) => {
                        this.handle_timer(timer);
                    });
            }
        }
    }

    private handle_action(action: IAction) {
        this.process_effects(action.effects);
    }

    private process_effects(effects: Effect[]) {
        for (const effect of effects) {
            switch (effect.kind) {
                case 'transition': {
                    this.transition(effect.stage);
                    break
                }
                case 'disable': {
                    for (const targetId of (effect as IDisable).actions) {
                        document.querySelector(`#${targetId}`)?.classList.add('disabled');
                    }
                    break
                }
                case 'enable': {
                    for (const targetId of (effect as IEnable).actions) {
                        document.querySelector(`#${targetId}`)?.classList.remove('disabled');
                    }
                    break
                }
            }
        }
    }

    private handle_timer(effects: Effect[]) {
        this.process_effects(effects);
    }
}
