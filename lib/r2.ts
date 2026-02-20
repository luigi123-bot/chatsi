import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

export async function uploadToR2(
    file: Buffer,
    fileName: string,
    contentType: string
) {
    const bucketName = process.env.R2_BUCKET_NAME || "chat-storage";
    const key = `uploads/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
    });

    try {
        await r2Client.send(command);

        // Return the public URL
        // If the user has a custom domain or a public r2.dev URL
        const publicUrlPrefix = process.env.R2_PUBLIC_URL || "";
        return `${publicUrlPrefix}/${key}`;
    } catch (error) {
        console.error("Error uploading to R2:", error);
        throw error;
    }
}
