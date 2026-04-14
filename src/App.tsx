import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import CardList from './components/CardList';
// Не забудь импортировать новый компонент для страниц по ссылке
import { SharedCardPage } from './components/SharedCardPage.tsx';
import { ThemeProvider } from './theme/ThemeProvider';
import { ThemeToggle } from './theme/ThemeToggle';

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <ThemeToggle />
                {/* Routes — это список всех возможных адресов твоего сайта */}
                <Routes>
                    {/* 1. Главная страница (localhost:5173/) */}
                    {/*<Route path="/" element={<CardList />} />*/}
                    <Route path="/:uuid" element={<SharedCardPage />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;