import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SeedTrackerComponent } from './seed-tracker/seed-tracker.component';
import { AboutComponent } from './about/about.component';
import { AuthGuard } from './auth.guard'; // Import the AuthGuard
import { PlansComponent } from './plans/plans.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'dashboard',
    component: SeedTrackerComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'about',
    component: AboutComponent,
  },
  {
    path: 'plans',
    component: PlansComponent,
  }, // Protect the dashboard route
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [CommonModule,RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
