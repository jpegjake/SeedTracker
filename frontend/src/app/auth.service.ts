// src/app/auth.service.ts
import { Injectable, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import {
  Observable,
  BehaviorSubject,
  of,
  Subscription,
  firstValueFrom,
  throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from './firebase.config';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private url: string = environment.apiUrl;
  private token: string;

  constructor(private http: HttpClient) {
    // Set persistence ONCE
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    // Listen for auth changes
    onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user);
    });

    this.token = localStorage.getItem('jwt') ?? '';
  }

  private createOrUpdateLocalAccount(
    email: string
  ): Observable<any> {
    return this.http.post(
      this.url + '/users',
      {
        "email":email
      }
    );
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    this.token = await result.user.getIdToken();
    localStorage.setItem('jwt', this.token ?? '');

    await firstValueFrom(this.createOrUpdateLocalAccount(result.user.email ?? ""));

    return result.user;
  }

  async register(email: string, password: string) {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (result.user != null) {
      this.token = await result.user?.getIdToken();
      localStorage.setItem('jwt', this.token ?? '');

      await firstValueFrom(
        this.createOrUpdateLocalAccount(result.user?.email ?? '')
      );
    }

    return result.user;
  }

  async login(email: string, password: string) {

    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    if (result.user != null) {
      this.token = await result.user?.getIdToken();
      localStorage.setItem('jwt', this.token ?? '');

      firstValueFrom(
        this.createOrUpdateLocalAccount(result.user?.email ?? '')
      );
    }

    return result.user;

  }

  logout() {
    signOut(auth);
    localStorage.removeItem('jwt');
    this.token = '';
  }

  isAuthenticated(): boolean {
    if (this.token != undefined && this.token != '') {
      return true;
    } else {
      return false;
    }
  }

  getToken(): string | null {
    return this.token;
  }
}
