//state test

var frisby = require('frisby');
var test_state = {
	name : 'TestState',
	objectId : '0000',
	objectName : 'TestObject',
	properties : {
		'test_prop_1' : '1',
		'test_prop_2' : '0'
	}
}

var test_object = {

    "address" : "40B39AFFD0",
    "db" : {},
    "name" : "TestObject",
    "objectId" : "0000",
    "properties" : {
        'test_prop_1' : '1',
		'test_prop_2' : '0'
    },
    "protocol" : "z"
}
var url = 'http://localhost:8083';
frisby.create('Apio Server States test: fetch all')
			.get(url+'/apio/state/')
			.expectStatus(200)
			.expectJSONTypes('', Array)
			.toss();

frisby.create('Apio Server States test: create')
	.post(url+'/apio/state',{'state' : test_state})
	.expectStatus(200)
	.afterJSON(function(json){

		frisby.create('Apio Server States test: read')
			.get(url+'/apio/state/'+test_state.name)
			.expectStatus(200)
			.expectJSON(test_state)
			.toss();
		frisby.create('Apio Server States test: read')
			.post(url+'/apio/state/apply',{'state' : test_state})
			.expectStatus(200)
			.toss();
		frisby.create('Apio Server States test: delete')
			.delete(url+'/apio/state/'+test_state.name)
			.expectStatus(200)
			.toss();

	})
	.toss();