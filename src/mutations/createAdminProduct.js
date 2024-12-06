import SimpleSchema from "simpl-schema";
import Random from "@reactioncommerce/random";
import ReactionError from "@reactioncommerce/reaction-error";
import cleanProductInput from "../utils/cleanProductInput.js";
import generateRandomReferenceId from "../utils/generateRandomReferenceId.js";

const inputSchema = new SimpleSchema({
    product: {
        type: Object,
        blackbox: true,
        optional: true,
    },
    shopId: String,

    sellerId: String,
    shouldCreateFirstVariant: {
        type: Boolean,
        optional: true,
    },
});

/**
 * @method createAdminProduct
 * @summary creates an empty product, with an empty variant
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Input arguments for the operation
 * @param {String} [input.product] - product data
 * @param {Boolean} [input.shouldCreateFirstVariant=true] - Auto-create one variant for the product
 * @param {String} input.shopId - the shop to create the product for
 * @param {String} input.sellerId - the shop to create the product for
 * 
 * @return {String} created productId
 */
export default async function createAdminProduct(context, input) {
    inputSchema.validate(input);

    const { appEvents, collections, simpleSchemas, accountId } = context;
    const { Product } = simpleSchemas;
    const { Products, Groups, Accounts } = collections;

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
            "Access denied: You do not have permission to create a product for this seller."
        );
    }

    const groups = await Groups.find({ _id: { $in: groupIds } }).toArray();
    console.log("GROUPS", groups);

    if (groups.some((group) => group.slug === "seller")) {
        throw new ReactionError(
            "unauthorized",
            "Access denied: You do not have permission to create a product for this seller."
        );
    }

    const {
        product: productInput,
        shopId,
        sellerId,
        shouldCreateFirstVariant = true,
    } = input;
    console.log("productInput", productInput);


    if (!productInput.media) {
        throw new ReactionError("Access denied:Not able to create product ");
    }
    console.log("productInput.media", productInput.media[0]);
    // Check for media.urls
    if (!productInput.media[0].URLs) {
        throw new ReactionError("invalid-param", "media.urls cannot be empty");
    }

    const { large, medium, small, thumbnail } = productInput.media[0].URLs;
    if (!large || !medium || !small || !thumbnail) {
        throw new ReactionError("invalid-param", "large, medium, small and thumbnail URLs cannot be empty");
    }


    let newProductId = (productInput && productInput._id) || Random.id();
    let lastReferenceId = await generateRandomReferenceId(context);

    console.log("lastReferenceId", lastReferenceId);


    const initialProductData = await cleanProductInput(context, {
        productId: newProductId,
        productInput,
        shopId,
        sellerId
    });


    if (initialProductData.isDeleted) {
        throw new ReactionError(
            "invalid-param",
            "Creating a deleted product is not allowed"
        );
    }

    const createdAt = new Date();
    const newProduct = {
        _id: newProductId,
        ancestors: [],
        createdAt,
        handle: "",
        isDeleted: false,
        isVisible: false,
        shopId,
        sellerId,
        shouldAppearInSitemap: true,
        supportedFulfillmentTypes: ["shipping"],
        title: "",
        brandId: productInput.brandId,
        type: "simple",
        updatedAt: createdAt,
        workflow: {
            status: "new",
        },
        referenceId: lastReferenceId,
        ...initialProductData,
    };
    console.log("newProduct", newProduct);

    // Apply custom transformations from plugins.
    for (const customFunc of context.getFunctionsOfType(
        "mutateNewProductBeforeCreate"
    )) {
        // Functions of type "mutateNewProductBeforeCreate" are expected to mutate the provided variant.
        // We need to run each of these functions in a series, rather than in parallel, because
        // we are mutating the same object on each pass.
        // eslint-disable-next-line no-await-in-loop
        await customFunc(newProduct, { context });
    }

    await Products.insertOne(newProduct);

    // Create one initial product variant for it
    // if (shouldCreateFirstVariant) {
    //   await context.mutations.createProductVariant(context.getInternalContext(), {
    //     productId: newProductId,
    //     shopId
    //   });
    // }

    await appEvents.emit("afterProductCreate", { product: newProduct });

    return newProduct;
}
