
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { CommonModule } from '@angular/common';

bootstrapApplication(App, appConfig).catch(err => console.error(err));
