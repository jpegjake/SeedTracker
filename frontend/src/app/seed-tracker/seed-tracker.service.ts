import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import { Observable, timer, BehaviorSubject, Subject, interval, merge } from 'rxjs';
import {
  switchMap,
  takeUntil,
  shareReplay,
  share,
  retryWhen,
  delay,
  tap, map
} from 'rxjs/operators';
import { SeedTracked } from './seedtracked';
import { AuthService } from '../auth.service';
import { environment } from '../../environments/environment';

export type PollingFunction<T> = () => Observable<T>;

@Injectable({
  providedIn: 'root',
})
export class SeedTrackerService {
  private url: string = environment.apiUrl;

  // A Subject to signal when polling should stop
  private stopPollingSubject = new Subject<void>();

  constructor(private http: HttpClient, private auth: AuthService) {}

  /**
   * Creates a polling Observable for a given HTTP request function.
   * @param requestFn The function that returns the HTTP Observable to be polled.
   * @param intervalMs The polling interval in milliseconds.
   * @param retryCount (Optional) The number of times to retry on error. Default is 0.
   * @param retryDelayMs (Optional) The delay between retries in milliseconds. Default is 1000.
   * @returns An Observable that emits the results of the polled request.
   */
  createPollingObservableShared<T>(
    requestFn: PollingFunction<T>,
    refreshTrigger: BehaviorSubject<void>,
    intervalMs: number,
    retryCount: number = 0,
    retryDelayMs: number = 1000
  ): Observable<T> {
    requestFn = requestFn.bind(this);
    return merge(timer(0, intervalMs), refreshTrigger).pipe(
      // Start immediately, then every intervalMs
      switchMap(() =>
        requestFn().pipe(
          retryWhen((errors) =>
            errors.pipe(
              tap((err) => console.error('Polling error:', err)),
              delay(retryDelayMs),
              takeUntil(timer(retryCount * (intervalMs + retryDelayMs))) // Stop retrying after N attempts
            )
          )
        )
      ),
      takeUntil(this.stopPollingSubject), // Stop polling when stopPolling is triggered
      shareReplay(1) // Share the Observable among multiple subscribers
    );
  }

  // Method to stop all active polling streams initiated by this service
  stopAllPolling(): void {
    this.stopPollingSubject.next();

    // You might want to reset the subject if you plan to start polling again later
    this.stopPollingSubject = new Subject<void>();
  }

  getPlantTypeData(): Observable<string[]> {
    // Create an observable that emits a value every 'intervalMs' milliseconds
    return this.http.get<string[]>(this.url + '/planttypes');
  }

  getPlantSubTypeData(type: string): Observable<string[]> {
    return this.http.get<string[]>(this.url + '/planttypes/' + type);
  }

  public getSeeds(): Observable<SeedTracked[]> {
    return this.http.get<SeedTracked[]>(this.url + '/seeds').pipe(
      map((data) => {
        for (const row of data) row.qty = +row.qty;
        return data;
      })
    );
  }

  public getAllSeeds(): Observable<SeedTracked[]> {
    return this.http.get<SeedTracked[]>(this.url + '/seeds/all').pipe(
      map((data) => {
        for (const row of data) row.qty = +row.qty;
        return data;
      })
    );
  }

  public editSeed(revised_plant: SeedTracked): Observable<any> {
    return this.http.put(this.url + '/seed', revised_plant);
  }

  public addSeed(new_plant: SeedTracked): Observable<any> {
    return this.http.post(this.url + '/seed', new_plant);
  }

  public deleteSeed(created: string): Observable<any> {
    return this.http.delete(this.url + '/seed', { body: { created: created } });
  }

/*   public deleteAllSeeds(): Observable<any> {
    return this.http.delete(this.url + '/seeds');
  } */
}
