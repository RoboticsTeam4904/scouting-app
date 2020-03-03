const serverURI = 'ws://127.0.0.1:8000';

interface IAction {
    name: string;
    label: string;
    accent: boolean;
    enabled: boolean;
    effects: Effect[];
}

type Action = string;
type Stage = string;

interface ITransition {
    kind: 'transition';
    stage: Stage;
}

interface IDisable {
    kind: 'disable';
    actions: Action[];
}

interface IAdd {
    kind: 'add';
    actions: IAction[];
}

interface IRemove {
    kind: 'remove';
    actions: IAction[];
}

interface IEnd {
    kind: 'end';
}

type Effect = ITransition | IDisable | IAdd | IRemove | IEnd;

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
    private timerIdx: number;

    constructor(stage: IStage, cb: (a0: IAction) => void, tcb: (effects: Effect[]) => void) {
        this.time = document.querySelector('.timer')!;
        this.start = performance.now();
        document.querySelector('.timer')?.classList.add('active');
        const el = document.createElement('div');
        el.classList.add('stage');
        el.innerHTML = `<div class="title">${stage.label}</div>`;
        const actions = document.createElement('div');
        actions.classList.add('actions');
        for (const action of stage.actions) {
            const item = document.createElement('div');
            item.addEventListener('click', () => { cb(action); });
            item.classList.add('action');
            item.textContent = action.label;
            if (action.accent) {
                item.classList.add('accent');
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
        const leastTimer = sortedTimers[this.timerIdx][0];
        if (leastTimer < 60000) {
            setInterval(() => {
                const time = performance.now() - this.start;
                const millis = Math.round((time % 1000) / 10).toString().padStart(2, '0');
                const secs = Math.floor(time / 1000).toString().padStart(2, '0');
                this.time.textContent = `${secs}:${millis}`;
                if (sortedTimers[this.timerIdx] && time >= sortedTimers[this.timerIdx][0]) {
                    tcb(sortedTimers[this.timerIdx][1]); this.timerIdx += 1;
                }
            }, 10);
        } else {
            setInterval(() => {
                const time = Math.floor((performance.now() - this.start) / 1000);
                const secs = Math.round(time % 60).toString().padStart(2, '0');
                const mins = Math.floor(time / 60).toString().padStart(2, '0');
                this.time.textContent = `${mins}:${secs}`;
                if (sortedTimers[this.timerIdx] && time >= sortedTimers[this.timerIdx][0]) {
                    tcb(sortedTimers[this.timerIdx][1]); this.timerIdx += 1;
                }
            }, 1000);
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

    constructor() {
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
                    const schema: ISchema = JSON.parse(data);
                    for (const stage of schema.stages) {
                        if (stage.name === schema.initial) {
                            const ui = new StageUI(stage, (action) => { this.handle_action(action); },
                                (timer) => {
                                    this.handle_timer(timer);
                                });
                        }
                    }
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
        for (const stage of schema.stages) {
            if (stage.name === schema.initial) {
                const ui = new StageUI(stage,
                    (action) => { this.handle_action(action); },
                    (timer) => {
                        this.handle_timer(timer);
                    });
            }
        }
    }

    private handle_action(action: IAction) {
        console.log(action);
    }

    private handle_timer(effects: Effect[]) {
        console.log(effects);
    }
}
