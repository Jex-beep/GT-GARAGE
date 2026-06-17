import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then((m) => m.Home),
    title: 'GT Garage — Auto Repair in Mabalacat',
  },
  {
    path: 'services',
    loadComponent: () => import('./services/services').then((m) => m.Services),
    title: 'Services — GT Garage',
  },
  {
    path: 'about',
    loadComponent: () => import('./about/about').then((m) => m.About),
    title: 'About — GT Garage',
  },
  {
    path: 'book',
    loadComponent: () => import('./book/book').then((m) => m.Book),
    title: 'Book a Service — GT Garage',
  },
  {
    path: 'blogs',
    loadComponent: () => import('./blogs/blogs').then((m) => m.Blogs),
    title: 'Blog — GT Garage',
  },
  {
    path: 'blogs/:slug',
    loadComponent: () => import('./blogs/blogs').then((m) => m.Blogs),
    title: 'Blog — GT Garage',
  },
  {
    path: 'track',
    loadComponent: () => import('./track/track').then((m) => m.Track),
    title: 'Track Your Booking — GT Garage',
  },
  {
    path: 'track/:id',
    loadComponent: () => import('./track/track').then((m) => m.Track),
    title: 'Track Your Booking — GT Garage',
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then((m) => m.Admin),
    title: 'Admin — GT Garage',
  },
  { path: '**', redirectTo: '' },
];