// Merchandising Audit module — registration entry point.
// The module is fully self-contained and gated by settingsStore.merchandisingEnabled.
// External callers should only import MerchStack and the public services from this file.

import MerchStack from './navigation/MerchStack';
import * as auditService from './services/auditService';
import * as photoUploader from './services/photoUploader';

export { MerchStack, auditService, photoUploader };
