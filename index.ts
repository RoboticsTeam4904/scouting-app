import 'file-loader?name=[name].[ext]!./index.html';
import App from './src/app';

window.onload = () => {
    const app = new App();
    const splash = document.querySelector('.splash');
    splash?.classList.add('loaded');
    setTimeout(() => {
        splash?.remove();
    }, 1000);
};
