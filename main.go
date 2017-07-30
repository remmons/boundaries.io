package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"

	// "github.com/paulmach/go.geojson"
	_ "github.com/joho/godotenv/autoload"
	"gopkg.in/kataras/iris.v6"
	// "gopkg.in/kataras/iris.v6/adaptors/cors"
	"gopkg.in/kataras/iris.v6/adaptors/httprouter"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
)

type Feature struct {
	ID         bson.ObjectId     `bson:"_id,omitempty" json:"id"`
	Properties map[string]string `bson:"properties" json:"properties"`
	Geometry   interface{}       `bson:"geometry" json:"geometry"`
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file: ", err)
	}

	app := iris.New()

	session, err := mgo.Dial(os.Getenv("MONGO_URL"))
	if err != nil {
		log.Fatal("could not connect to db: ", err)
		panic(err)
	}
	defer session.Close()
	session.SetMode(mgo.Monotonic, true)

	app.Adapt(
		// adapt a logger which prints all errors to the os.Stdout
		iris.DevLogger(),
		// adapt the adaptors/httprouter or adaptors/gorillamux
		httprouter.New(),
		// Cors wrapper to the entire application, allow all origins.
		// cors.New(cors.Options{AllowedOrigins: []string{"*"}}),
	)

	makeWhereAmI := func(featureName string) func(ctx *iris.Context) {
		return func(ctx *iris.Context) {
			feature := Feature{}

			c := session.DB("geo").C(featureName)

			lat, latErr := strconv.ParseFloat(ctx.URLParam("lat"), 64)
			if latErr != nil {
				ctx.EmitError(iris.StatusBadRequest)
				return
			}
			lng, lngErr := strconv.ParseFloat(ctx.URLParam("lng"), 64)
			if lngErr != nil {
				ctx.EmitError(iris.StatusBadRequest)
				return
			}

			query := bson.M{
				"geometry": bson.M{
					"$geoIntersects": bson.M{
						"$geometry": bson.M{
							"type":        "Point",
							"coordinates": []float64{lng, lat},
						},
					},
				},
			}

			str, _ := json.Marshal(query)

			fmt.Println(string(str))

			err = c.Find(query).One(&feature)

			if err != nil {
				log.Println(err)
				ctx.EmitError(iris.StatusNotFound)
				return
			}

			ctx.JSON(iris.StatusOK, feature)
		}
	}

	api := app.Party("/api/v2", apiMiddleware)
	api.OnError(404, notFoundHandler)
	api.OnError(400, badRequestHandler)

	us := api.Party("/us")
	us.Party("/states").Get("/whereami", makeWhereAmI("states"))
	us.Party("/postal-codes").Get("/whereami", makeWhereAmI("postalcodes"))
	us.Party("/counties").Get("/whereami", makeWhereAmI("counties"))
	us.Party("/places").Get("/whereami", makeWhereAmI("places"))
	us.Party("/cities").Get("/whereami", makeWhereAmI("cities"))
	us.Party("/countries").Get("/whereami", makeWhereAmI("countries"))
	us.Party("/neighborhoods").Get("/whereami", makeWhereAmI("neighborhoods"))

	// {
	// api.OnError(404, notFoundHandler)
	// api.Get("/:id", getByIDHandler)
	// api.Post("/", saveUserHandler)
	// }

	app.Listen(":3001")
}

func apiMiddleware(ctx *iris.Context) {
	// your code here...
	println("API V2 Request: " + ctx.Path())
	ctx.Next() // go to the next handler(s)
}

func notFoundHandler(ctx *iris.Context) {
	ctx.JSON(iris.StatusNotFound, map[string]string{"error": "Not found"})
}
func badRequestHandler(ctx *iris.Context) {
	ctx.JSON(iris.StatusBadRequest, map[string]string{"error": "Bad request"})
}
