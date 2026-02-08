import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TrimbimFileService {
  constructor(private http: HttpClient) {}

  getTrbFileAsBlob(url: string): Observable<Blob> {
    const urlObj = new URL(url);
    const targetUrl = `${urlObj.origin}${urlObj.pathname}`;
    return this.http.get(targetUrl, { responseType: 'blob' });
  }
}
