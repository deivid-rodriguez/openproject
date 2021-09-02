import { Injectable } from '@angular/core';
import {
  Observable,
  Subject,
} from 'rxjs';
import { Action } from '@datorama/akita-ng-effects/lib/types';
import { ofType } from '@datorama/akita-ng-effects';
import { ActionCreator } from 'ts-action/action';
import { ActionType } from 'ts-action';

@Injectable({ providedIn: 'root' })
export class ActionsService {
  private actions = new Subject<Action>();

  /** Entire event stream */
  public actions$ = this.actions.asObservable();

  /**
   * Observe one or more event type
   * @param action The set of action creators to listen for
   * */
  ofType<C extends ActionCreator>(action:C):Observable<ActionType<C>> {
    return this
      .actions$
      .pipe(
        ofType(action),
      );
  }
}
