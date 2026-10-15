import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests',timeout:60000,workers:1,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:390,height:844}},webServer:{command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},reporter:[['list'],['html',{open:'never'}]]});
