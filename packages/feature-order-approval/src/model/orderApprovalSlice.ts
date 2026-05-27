import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { OrderApprovalRecord, OrderApprovalState } from './orderApprovalTypes';

export const orderApprovalReducerKey = 'orderApproval';

const initialState: OrderApprovalState = {
  byId: {},
};

function createMockApproval(orderId: string, comment = ''): OrderApprovalRecord {
  return {
    orderId,
    portfolioId: 'PF-001',
    amount: {
      value: 1250000,
      currency: 'EUR',
    },
    status: 'ready',
    comment,
  };
}

const orderApprovalSlice = createSlice({
  name: orderApprovalReducerKey,
  initialState,
  reducers: {
    orderApprovalLoadRequested(
      state,
      action: PayloadAction<{ orderId: string }>,
    ) {
      const current = state.byId[action.payload.orderId];

      state.byId[action.payload.orderId] = {
        ...(current ?? createMockApproval(action.payload.orderId)),
        status: 'loading',
        errorMessage: undefined,
      };
    },

    orderApprovalLoadSucceeded(
      state,
      action: PayloadAction<{ orderId: string }>,
    ) {
      const current = state.byId[action.payload.orderId];

      state.byId[action.payload.orderId] = createMockApproval(
        action.payload.orderId,
        current?.comment ?? '',
      );
    },

    orderApprovalCommentChanged(
      state,
      action: PayloadAction<{ orderId: string; comment: string }>,
    ) {
      const current =
        state.byId[action.payload.orderId] ??
        createMockApproval(action.payload.orderId);

      state.byId[action.payload.orderId] = {
        ...current,
        comment: action.payload.comment,
        errorMessage: undefined,
      };
    },

    orderApprovalApproveRequested(
      state,
      action: PayloadAction<{ orderId: string }>,
    ) {
      const current = state.byId[action.payload.orderId];

      if (!current) {
        state.byId[action.payload.orderId] = {
          ...createMockApproval(action.payload.orderId),
          status: 'failed',
          errorMessage: 'Approval details must be loaded before approval.',
        };
        return;
      }

      if (!current.comment.trim()) {
        current.errorMessage = 'Add a comment before approving this order.';
        return;
      }

      current.status = 'approved';
      current.errorMessage = undefined;
    },

    orderApprovalRejectRequested(
      state,
      action: PayloadAction<{ orderId: string }>,
    ) {
      const current = state.byId[action.payload.orderId];

      if (!current) {
        state.byId[action.payload.orderId] = {
          ...createMockApproval(action.payload.orderId),
          status: 'failed',
          errorMessage: 'Approval details must be loaded before rejection.',
        };
        return;
      }

      if (!current.comment.trim()) {
        current.errorMessage = 'Add a comment before rejecting this order.';
        return;
      }

      current.status = 'rejected';
      current.errorMessage = undefined;
    },

    orderApprovalReset(state, action: PayloadAction<{ orderId: string }>) {
      delete state.byId[action.payload.orderId];
    },
  },
});

export const orderApprovalReducer = orderApprovalSlice.reducer;

export const {
  orderApprovalApproveRequested,
  orderApprovalCommentChanged,
  orderApprovalLoadRequested,
  orderApprovalLoadSucceeded,
  orderApprovalRejectRequested,
  orderApprovalReset,
} = orderApprovalSlice.actions;
