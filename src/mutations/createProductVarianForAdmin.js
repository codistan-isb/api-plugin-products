import SimpleSchema from "simpl-schema";
import Logger from "@reactioncommerce/logger";
import Random from "@reactioncommerce/random";
import ReactionError from "@reactioncommerce/reaction-error";
import { ProductVariant } from "../simpleSchemas.js";
import cleanProductVariantInput from "../utils/cleanProductVariantInput.js";
import isAncestorDeleted from "../utils/isAncestorDeleted.js";

const inputSchema = new SimpleSchema({
    productId: String,
    shopId: String,
    variant: {
        type: Object,
        blackbox: true,
        optional: true,
    },
});

/**
 * @method createProductVarianForAdmin
 * @summary creates an empty variant on the product supplied
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Input arguments for the bulk operation
 * @param {String} input.productId - the product or variant ID which we create new variant on
 * @param {String} input.shopId - the shop to create the variant for
 * @param {Object} [input.variant] - variant data
 * @return {String} created variantId
 */
export default async function createProductVarianForAdmin(context, input) {
    inputSchema.validate(input);
    const { collections, accountId } = context;
    const { Products, Groups, Accounts } = collections;
    const { productId, shopId, variant: productVariantInput } = input;


    console.log("ACCOUNT ID IN THE PRODUCT", accountId);

    // Fetch account data to check groups
    const account = await Accounts.findOne({ _id: accountId });

    if (!account || !account.groups || !Array.isArray(account.groups)) {
        throw new ReactionError("unauthorized", "Invalid account or groups data.");
    }

    // Fetch groups from the Groups collection
    const groupIds = account.groups;

    if (groupIds.length === 0) {
        throw new ReactionError(
            "unauthorized",
            "Access denied: You do not have permission to create a product variants for this seller."
        );
    }

    const groups = await Groups.find({ _id: { $in: groupIds } }).toArray();
    console.log("GROUPS", groups);

    if (groups.some((group) => group.slug === "seller")) {
        throw new ReactionError(
            "unauthorized",
            "Access denied: You do not have permission to create a product variants for this seller."
        );
    }

    // See that user has permission to create variant
    // await context.validatePermissions("reaction:legacy:products", "create", {
    //     shopId,
    // });
    let uploadedBy;
    // See that parent product exists
    const parentProduct = await Products.findOne({ _id: productId, shopId });
    const uploadedByName = productVariantInput.uploadedBy.name
    const uploadedByuserId = productVariantInput.uploadedBy.userId

    console.log("UPLOADED BY", uploadedByName)
    console.log("UPLOADED USERID", uploadedByuserId)

    console.log("parentProduct", parentProduct);
    console.log("User ", context.user);
    if (parentProduct.uploadedBy) {
        uploadedBy = parentProduct.uploadedBy;
    } else {
        uploadedBy = {
            name: uploadedByName,
            userId: uploadedByuserId,
        };
    }

    if (!parentProduct) {
        throw new ReactionError("not-found", "Product not found");
    }
    console.log("productVariantInput", productVariantInput);
    console.log("variant", productVariantInput.price);
    if (productVariantInput.price === 0 || productVariantInput.price === null) {
        throw new ReactionError("invalid-param", "Price cannot be 0");
    }
    if (!productVariantInput.media) {
        throw new ReactionError("invalid-param", "media cannot be empty");
    }
    console.log("productInput.media", productVariantInput.media[0]);
    // Check for media.urls
    if (!productVariantInput.media[0].URLs) {
        throw new ReactionError("invalid-param", "media.urls cannot be empty");
    }

    const { large, medium, small, thumbnail } = productVariantInput.media[0].URLs;
    if (!large || !medium || !small || !thumbnail) {
        throw new ReactionError("invalid-param", "large, medium, small and thumbnail URLs cannot be empty");
    }

    let product;
    let parentVariant;
    if (parentProduct.type === "variant") {
        product = await Products.findOne({
            _id: parentProduct.ancestors[0],
            shopId,
        });
        parentVariant = parentProduct;
    } else {
        product = parentProduct;
        parentVariant = null;
    }

    // Verify that parent is not deleted
    // Variants cannot be created on a deleted product
    if (await isAncestorDeleted(context, product, true)) {
        throw new ReactionError(
            "server-error",
            "Unable to create product variant on a deleted product"
        );
    }

    // get ancestors to build new ancestors array
    let { ancestors } = parentProduct;
    if (Array.isArray(ancestors)) {
        ancestors.push(productId);
    } else {
        ancestors = [productId];
    }

    const initialProductVariantData = await cleanProductVariantInput(context, {
        productVariantInput,
    });

    if (initialProductVariantData.isDeleted) {
        throw new ReactionError(
            "invalid-param",
            "Creating a deleted product variant is not allowed"
        );
    }

    // Generate a random ID, but only if one was not passed in
    const newVariantId =
        (productVariantInput && productVariantInput._id) || Random.id();

    const createdAt = new Date();
    const newVariant = {
        _id: newVariantId,
        ancestors,
        createdAt,
        isDeleted: false,
        isVisible: false,
        shopId,
        type: "variant",
        updatedAt: createdAt,
        workflow: {
            status: "new",
        },
        ...initialProductVariantData,
    };
    const isOption = ancestors.length > 1;

    // Apply custom transformations from plugins.
    for (const customFunc of context.getFunctionsOfType(
        "mutateNewVariantBeforeCreate"
    )) {
        // Functions of type "mutateNewVariantBeforeCreate" are expected to mutate the provided variant.
        // We need to run each of these functions in a series, rather than in parallel, because
        // we are mutating the same object on each pass.
        // eslint-disable-next-line no-await-in-loop
        await customFunc(newVariant, { context, isOption, parentVariant, product });
    }

    ProductVariant.validate(newVariant);
    if (uploadedBy) {
        // await Products.updateOne({ _id: productId }, { uploadedBy });
        await Products.updateOne(
            { _id: productId },
            { $set: { sellerId: uploadedBy?.userId } }
        );
    }

    await Products.insertOne(newVariant);

    Logger.debug(
        `createProductVarianForAdmin: created variant: ${newVariantId} for ${productId}`
    );

    return newVariant;
}
