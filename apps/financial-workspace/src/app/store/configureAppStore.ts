import { configureStore } from '@reduxjs/toolkit';
import {
  orderApprovalReducer,
  orderApprovalReducerKey,
} from '@demo/feature-order-approval';

export const appStore = configureStore({
  reducer: {
    [orderApprovalReducerKey]: orderApprovalReducer,
  },
});

export type RootState = ReturnType<typeof appStore.getState>;
export type AppDispatch = typeof appStore.dispatch;
