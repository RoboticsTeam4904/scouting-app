const serverURI = 'ws://127.0.0.1:8000';

interface IAction {
    name: string;
    label: string;
    accent: boolean;
    enabled: boolean;
    effect: Effect;
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

interface IReplace {
    kind: 'replace';
    actions: IAction[];
}

interface INone {
    kind: 'none';
}

type Effect = ITransition | IDisable | IReplace | INone;

interface IStage {
    name: Stage;
    label: string;
    timers: [number, Effect][];
    actions: IAction[];
}

interface ISchema {
    stages: IStage[];
    initial: string;
}

class StageUI {
    private start: number;
    private time: Element;

    constructor(stage: IStage, cb: (a0: IAction) => void) {
        this.time = document.querySelector('.timer')!;
        this.start = performance.now();
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
        const leastTimer = Math.min(...stage.timers.map((timer) => (timer[0])));
        if (leastTimer < 60000) {
            setInterval(() => {
                const time = performance.now() - this.start;
                const millis = Math.round((time % 1000) / 10).toString().padStart(2, '0');
                const secs = Math.floor(time / 1000).toString().padStart(2, '0');
                this.time.textContent = `${secs}:${millis}`;
            }, 10);
        } else {
            setInterval(() => {
                const time = Math.floor((performance.now() - this.start) / 1000);
                const secs = Math.round(time % 60).toString().padStart(2, '0');
                const mins = Math.floor(time / 60).toString().padStart(2, '0');
                this.time.textContent = `${mins}:${secs}`;
            }, 1000);
        }
    }
}

export default class App {
    private initialized: boolean;
    private schema: ISchema;

    constructor() {
        const server = new WebSocket(serverURI);
        server.onerror = () => {
            if (!this.initialized) {
                const data = localStorage.getItem('schema');
                if (!data) {
                    const el = document.createElement('div');
                    document.body.appendChild(el);
                    el.outerHTML = `<div style="display: flex; padding: 30px; width: 100vw; height: 100vh; justify-content: center; align-items: center; font-size: 3em; font-weight: bold; flex-flow: column; line-height: 1;"><div>Connection failed<div style="font-size: 0.5em; font-weight: normal; opacity: 0.7; margin-top: 10px;">No schema available</div></div></div>`;
                } else {
                    const schema: ISchema = JSON.parse(data);
                    for (const stage of schema.stages) {
                        if (stage.name === schema.initial) {
                            const ui = new StageUI(stage, (action) => { });
                        }
                    }
                }
            }
        };
        server.onopen = () => {
            if (!this.initialized) {
                const schema = localStorage.getItem('schema');
                if (!schema) {
                    server.send('g');
                }
            }
        };
        server.onmessage = (message) => {
            if (!this.initialized) {
                localStorage.setItem('schema', message.data);
                this.schema = JSON.parse(message.data);
            }
        };
    }
}
