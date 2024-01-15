export default async function InstagramKey(_, args, context, info) {
    const { collections } = context;
    const { SocialMedia } = collections;

    const instagramKey = await SocialMedia.find().toArray();
    console.log("instagramKey",instagramKey[0]?.key)
    const instaKey ={
        key: instagramKey[0]?.key
    }
    console.log("instaKey",instaKey)
    return instaKey ;

}
