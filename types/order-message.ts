/**
 * Order message type definitions
 * A per-order conversation thread shared between the buyer, the product owner(s)/seller
 * and admins. Each message may optionally carry a single file attachment.
 */

/**
 * A single order message as returned to the client (sender flattened, dates as ISO strings).
 */
export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  /** Sender display name (may be empty) */
  senderName: string | null;
  senderEmail: string;
  /** Sender's user_role (user, admin, client, retailer) */
  senderRole: string;
  body: string;
  attachmentUrl: string | null;
  attachmentFileId: string | null;
  attachmentFileName: string | null;
  createdAt: string;
}
