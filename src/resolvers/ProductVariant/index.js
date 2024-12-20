import resolveShopFromShopId from "@reactioncommerce/api-utils/graphql/resolveShopFromShopId.js";
import { encodeProductOpaqueId } from "../../xforms/id.js";
import getVariants from "../../utils/getVariants.js";
import getVariantMedia from "../../utils/getVariantMedia.js";
import productStoreInfo from "./productStoreInfo.js";
import checkSoldOut from "./checkSoldOut.js";

export default {
  _id: (node) => encodeProductOpaqueId(node._id),
  media: (node, args, context) => getVariantMedia(node, context),
  metafields: (node) => node.metafields || [],
  options: (node, args, context) =>
    getVariants(context, node._id, undefined, args),
  shop: resolveShopFromShopId,
  productStoreInfo: (node, args, context) =>
    productStoreInfo(node, args, undefined, context),
  checkSoldOut: (node, args, context) =>
    checkSoldOut(node, args, context),
};
