import type { UnknownAction } from '@reduxjs/toolkit';
import {
  orderApprovalEpic,
  type OrderApprovalRootState,
} from '@demo/feature-order-approval';
import type { Epic } from 'redux-observable';

import type { AppDependencies } from './appDependencies';

export const rootEpic: Epic<
  UnknownAction,
  UnknownAction,
  OrderApprovalRootState,
  AppDependencies
> = (action$, state$, dependencies) =>
  orderApprovalEpic(action$, state$, dependencies);
