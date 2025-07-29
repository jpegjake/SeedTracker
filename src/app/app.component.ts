import { Component } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent {
  testVal = "test";
  title = 'Hello World!';
  preset = "default-value";
  isDisabled = false;
  imgSrc =
    'https://images.pexels.com/photos/556416/pexels-photo-556416.jpeg?cs=srgb&dl=landscape-mountains-nature-556416.jpg&fm=jpg';

  constructor(private authService: AuthService) {}

  logout() {
    this.authService.logout();
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}
