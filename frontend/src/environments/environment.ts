// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export class environment {
  public static readonly production: boolean = false;
  public static readonly apiUrl: string =
    'http://localhost:3000';
  public static readonly firebase: object = {
    apiKey: 'AIzaSyCtDUzlnITmwsR3KIRy-4hnMtJJS_VW5VI',
    authDomain: 'seedtracker-89438.firebaseapp.com',
    projectId: 'seedtracker-89438',
    storageBucket: 'seedtracker-89438.firebasestorage.app',
    messagingSenderId: '192850281419',
    appId: '1:192850281419:web:9fd9e5d36475281cac6c4e',
    measurementId: 'G-X6REGYJSTS',
  };
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
