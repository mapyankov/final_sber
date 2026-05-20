import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import App from '../App';
import { ThemeProvider } from '../context/ThemeContext';
import { I18nProvider } from '../i18n';

describe('App', () => {
  it('renders home page title', () => {
    render(
      <ThemeProvider>
        <I18nProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </I18nProvider>
      </ThemeProvider>,
    );
    expect(screen.getByText(/Генератор тестов|Test Generator/)).toBeInTheDocument();
  });
});
