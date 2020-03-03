import 'file-loader?name=[name].[ext]!./index.html';
import App from './src/app';

window.onload = () => {
    const app = new App();
};
