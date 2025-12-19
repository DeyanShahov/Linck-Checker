// ==========================
// КОНФИГУРАЦИЯ И КОНСТАНТИ
// ==========================

// Конфигурация за проверката
const CHECK_CONFIG = {
    maxPosts: 500, // Може да се увеличи ако е нужно
    maxLinks: Infinity, // Обработва всички намерени линкове
    batchSize: 5,
    requestTimeout: 15000,
    batchDelay: 1500,
    methodRetryDelay: 1000
};

// Типове линкове с иконки и филтри
const LINK_TYPES = {
    all: { label: 'Всички', icon: '📋', filter: () => true },
    image: { label: 'Изображения', icon: '🖼️', filter: link => link.type === 'image' },
    video: { label: 'Видео', icon: '🎬', filter: link => link.type === 'video' },
    audio: { label: 'Аудио', icon: '🎵', filter: link => link.type === 'audio' },
    webpage: { label: 'Уеб страници', icon: '🌐', filter: link => link.type === 'webpage' },
    document: { label: 'Документи', icon: '📄', filter: link => link.type === 'document' },
    youtube: { label: 'YouTube', icon: '🎥', filter: link => link.type === 'youtube' },
    vimeo: { label: 'Vimeo', icon: '🎞️', filter: link => link.type === 'vimeo' },
    unknown: { label: 'Непознати', icon: '❓', filter: link => link.type === 'unknown' }
};

// ==========================
// ГЛОБАЛНИ ПРОМЕНЛИВИ
// ==========================
let allLinks = [];
let currentFilter = 'all';
let isChecking = false;
let appState = 'idle'; // 'idle' | 'analysis' | 'checking'
let selectedTypes = ['all']; // Избраните типове за проверка
let serverOnline = false;
let currentPage = 1;
let itemsPerPage = 50;

// ==========================
// SERVER КОНФИГУРАЦИЯ
// ==========================
const SERVER_BASE_URL = 'http://localhost:3000';
