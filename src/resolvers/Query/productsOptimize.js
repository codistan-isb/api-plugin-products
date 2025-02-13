export default async function productsOptimize(parent, args, context, info) {
    if (!context.queries.productsOptimize) {
        throw new Error("GetAllCategories function is not defined in queries.");
    }

    let getCategories = await context.queries.productsOptimize(context, args);
    return getCategories;
}
