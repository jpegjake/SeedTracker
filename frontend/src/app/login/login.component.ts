import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false,
})
export class LoginComponent {
  email = '';
  regEmail = '';
  password = '';
  regPassword = '';
  passwordConfirm = '';
  regPasswordConfirm = '';
  message = '';
  currentSection: string = 'section1';

  constructor(private auth: AuthService, private router: Router) {
    this.currentSection = 'section1';
  }

  async onLogin() {
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (err) {
      console.error('Login error:', err);
      this.message = 'Login failed.';
    }
  }

  async onRegister() {
    try {
      await this.auth.register(this.regEmail, this.regPasswordConfirm);
      this.router.navigate(['/login']);
    } catch (err) {
      this.message = err as string;
    }
  }

  async loginWithGoogle() {
    try {
      await this.auth.loginWithGoogle();
      this.router.navigate(['/dashboard']);
    } catch (err) {
      console.error('Google login error:', err);
    }
  }
}
