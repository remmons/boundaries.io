objects=zcta5 county place state
tiger_url=ftp://ftp2.census.gov/geo/tiger/TIGER2015
db_name=geo

zcta5: zcta5.geo.json
	$(call importAndIndex,postalcodes,GEOID10)

county: county.geo.json
	$(call importAndIndex,counties,NAME)

place: place.geo.json
	$(call importAndIndex,places,NAME)

state: state.geo.json
	$(call importAndIndex,states,NAME)

%.geo.json: %.zip
	ogr2ogr -t_srs crs:84 -f "GeoJSON" /vsistdout/ /vsizip/$< | \
		./data/pluck_features.js > $@.tmp
	mv $@.tmp $@ && rm $<

%.zip: %.manifest
	curl $(shell head -n 1 $<) -o $@.download
	mv $@.download $@ && rm $<

%.manifest:
	$(eval url := $(tiger_url)/$(shell echo $* | tr -s '[:lower:]' '[:upper:]')/)
	curl -l $(url) | \
		sort -nr | \
		sed 's,^,$(url),' > $*.tmp
	test -s ./$*.tmp && mv $*.tmp $@

image:
	docker build -t gcr.io/boundariesio/api:$$(git rev-parse --short HEAD) .

push: image
	gcloud docker push gcr.io/boundariesio/api:$$(git rev-parse --short HEAD)


clean:
	# pass

define importAndIndex
	curl -XPUT "localhost:9200/$1" -d '{\
		"mappings": {\
			"geo": {\
				"properties": {\
					"properties": {\
						"type": "object"\
					},\
					"geometry": {\
						"type": "geo_shape"\
					}\
				}\
			}\
		}\
	}'; echo
	cat $< | ./data/upsert_elasticsearch.js $1 $2
endef

.PRECIOUS: %.zip %.geo.json
.INTERMEDIATE: %.tmp

.PHONY: clean $(objects) image