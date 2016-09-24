objects=zcta5 county place state
tiger_url=ftp://ftp2.census.gov/geo/tiger/TIGER2014
db_name=geo

zcta5: zcta5.geo.json
	$(call importAndIndex,postalcodes,properties.GEOID10)

county: county.geo.json
	$(call importAndIndex,counties,properties.NAME)

place: place.geo.json
	$(call importAndIndex,places,properties.NAME)

state: state.geo.json
	$(call importAndIndex,states,properties.NAME)

%.geo.json: %.zip
	ogr2ogr -t_srs crs:84 -f "GeoJSON" /vsistdout/ /vsizip/$< | \
		jq '.features' > $@.tmp
	mv $@.tmp $@ && rm $<

%.zip: %.manifest
	curl $(shell head -n 1 $<) -o $@.download
	mv $@.download $@ && rm $<

%.manifest:
	$(eval url := $(tiger_url)/$(shell echo $* | tr -s '[:lower:]' '[:upper:]')/)
	curl -l $(url) | \
		sort -nr | \
		sed 's,^,$(url)/,' > $*.tmp
	test -s ./$*.tmp && mv $*.tmp $@

image:
	docker build -t gcr.io/boundariesio/api:$$(git rev-parse --short HEAD) .

push: image
	gcloud docker push gcr.io/boundariesio/api:$$(git rev-parse --short HEAD)


clean:
	# pass

define importAndIndex
	mongo localhost/$(db_name) --eval "JSON.stringify(db.$1.ensureIndex({geometry: '2dsphere'}))"
	mongo localhost/$(db_name) --eval "JSON.stringify(db.$1.ensureIndex({'$2': 'text'}))"
	mongoimport \
		--jsonArray \
		--upsert \
		--upsertFields $2 \
		--collection $1 \
		--db $(db_name) \
		< ./$<
endef

.PRECIOUS: %.zip %.geo.json
.INTERMEDIATE: %.tmp

.PHONY: clean $(objects) image