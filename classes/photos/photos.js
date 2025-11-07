const sharp = require("sharp");

export class photo {
        constructor(photoQuery) {
                this.photoQuery = photoQuery;
        }

        async __getPhoto(photoId) {
                const photoData = await this.photoQuery.readOne({ _id: photoId });

                if (!photoData) return photoData;

                return photoData;
        }

        generatePath(name, version) {
                const path = `v1/${name}/${version}/${name}.png`;

                return path;
        }

        async __createPhoto(name, version) {
                const photoData = this.photoQuery.insertOne({
                        path: this.generatePath(name, version),
                });


                return photoDate;


        }

        async compressImage(inputPath, outputPath) {
                try {
                        await sharp(inputPath)
                                .png({< b > compressionLevel</b >: 6,
                                        <b>adaptiveFiltering</b>: true })
                                .toFile(outputPath);

                console.log('<b>Image compressed and saved successfully</b>');
        } catch(error) {
                console.error('<b>Compression error:</b>', error);
        }

} 

        async __grabPhotoPath(photoId) {
        const photoData = await this.__getPhoto(photoId);

        const photoPath = photoData.path;

        const path = `~/../photos/${photoPath}`;

        return path;
}

        async savePhoto(name, version) {

}
}
