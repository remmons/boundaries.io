package main

import (
	"github.com/gocraft/web"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"log"
	"strconv"
	// "github.com/jbielick/boundaries.io/controllers"
	"github.com/corneldamian/json-binding"
	"github.com/jbielick/boundaries.io/models"
	"net/http"
)

var session *mgo.Session

type Context struct {
	db             *mgo.Database
	RequestJSON    interface{}
	ResponseJSON   interface{}
	ResponseStatus int
}

func (c *Context) AttachDB(rw web.ResponseWriter, req *web.Request, next web.NextMiddlewareFunc) {
	c.db = session.DB("boundaries-io")
	next(rw, req)
}

func (c *Context) WhereAmI(rw web.ResponseWriter, req *web.Request) {
	var result models.Geo

	lat, laterr := strconv.ParseFloat(req.FormValue("lat"), 64)

	if laterr != nil {
		c.ResponseJSON = binding.ErrorResponse("could not parse 'lat' param", 10)
		c.ResponseStatus = http.StatusBadRequest
		return
	}

	lng, lngerr := strconv.ParseFloat(req.FormValue("lng"), 64)

	if lngerr != nil {
		c.ResponseJSON = binding.ErrorResponse("could not parse 'lng' param", 10)
		c.ResponseStatus = http.StatusBadRequest
		return
	}

	err := c.db.
		C(req.PathParams["collection"]).
		Find(nearOrIntersectsQuery("$geoIntersects", lng, lat)).
		One(&result)

	if err != nil {
		c.ResponseJSON = binding.ErrorResponse(err.Error(), 50)
		c.ResponseStatus = http.StatusInternalServerError
		return
	}

	c.ResponseJSON = binding.SuccessResponse(result)
	c.ResponseStatus = http.StatusOK
}

func (c *Context) NearMe(rw web.ResponseWriter, req *web.Request) {

}

func (c *Context) Named(rw web.ResponseWriter, req *web.Request) {

}

func nearOrIntersectsQuery(op string, lng float64, lat float64) bson.M {
	return bson.M{
		"geometry": bson.M{
			op: bson.M{
				"$geometry": bson.M{
					"type":        "Point",
					"coordinates": []float64{lng, lat},
				},
			},
		},
	}
}

func main() {

	router := web.New(Context{}).
		Middleware(web.LoggerMiddleware).
		Middleware(web.ShowErrorsMiddleware).
		Middleware(binding.Response(nil)).
		Middleware((*Context).AttachDB)

	session = models.Connect()

	router.Get("/boundaries/whereami", (*Context).WhereAmI)
	router.Get("/boundaries/at", (*Context).WhereAmI)
	router.Get("/boundaries/nearme", (*Context).NearMe)
	router.Get("/boundaries/near", (*Context).NearMe)
	router.Get("/boundaries/named/:name", (*Context).Named)

	log.Println("Server's Up!")

	http.ListenAndServe(":3001", router)
}
