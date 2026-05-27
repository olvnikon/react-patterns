import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import {
  orderApprovalReducer,
  orderApprovalReducerKey,
  type OrderApprovalRootState,
} from '@demo/feature-order-approval';
import { createEpicMiddleware } from 'redux-observable';

import {
  createAppDependencies,
  type AppDependencies,
} from './appDependencies';
import { rootEpic } from './rootEpic';

const epicMiddleware = createEpicMiddleware<
  UnknownAction,
  UnknownAction,
  OrderApprovalRootState,
  AppDependencies
>({
  dependencies: createAppDependencies(),
});

export const appStore = configureStore({
  reducer: {
    [orderApprovalReducerKey]: orderApprovalReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(epicMiddleware),
});

epicMiddleware.run(rootEpic);

export type RootState = ReturnType<typeof appStore.getState>;
export type AppDispatch = typeof appStore.dispatch;
