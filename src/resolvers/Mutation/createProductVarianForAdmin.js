import { decodeProductOpaqueId, decodeShopOpaqueId } from "../../xforms/id.js";

/**
 *
 * @method createProductVarianForAdmin
 * @summary initializes empty variant template
 * @param {Object} _ - unused
 * @param {Object} args - The input arguments
 * @param {Object} args.input - mutation input object
 * @param {String} args.input.clientMutationId - The mutation id
 * @param {String[]} args.input.productId - the product or variant ID which we create new variant on
 * @param {String[]} args.input.shopId - the shop to create the variant for
 * @param {Object} [args.input.variant] - variant data
 * @param {Object} context - an object containing the per-request state
 * @return {Promise<Object>} createProductVarianForAdmin payload
 */
export default async function createProductVarianForAdmin(_, { input }, context) {
    const {
        clientMutationId = null,
        productId,
        shopId,
        variant: variantInput
    } = input;

    const variant = await context.mutations.createProductVarianForAdmin(context, {
        productId: decodeProductOpaqueId(productId),
        shopId: decodeShopOpaqueId(shopId),
        variant: variantInput
    });

    return {
        clientMutationId,
        variant
    };
}
