import { resolve } from 'rsvp';
import retry from 'dummy/retry';
import { module, test } from 'qunit';
import { later } from '@ember/runloop';

module('Unit | Utility | retry', function() {

  test('it works with function', function(assert) {
    let done = assert.async();
    retry((resolve)=> {
      resolve(7);
    }, 3, ()=>{ return 2;}).then((result)=>{
      assert.equal(result, 7);
      done();
    }).catch((error)=>{
      assert.ok(false, error);
      done();
    });
  });

  test('it work with function that throws', function(assert){
    let done = assert.async();
    retry(()=>{
      throw "I'm throwing";
    }, 3, 1).then((result)=>{
      assert.ok(false, result);
      done();
    }).catch((error)=>{
      assert.equal("I'm throwing", error);
      done();
    });
  });

  test('it rejects when no function', function(assert) {
    let done = assert.async();
    retry(undefined, 5, ()=>{return 2;}).then((result)=>{
      assert.ok(false, result);
      done();
    }).catch((error)=>{
      assert.equal(error.trim(), 'Function required');
      done();
    });
  });

  test('it works with function returning a promise', function(assert) {
    let done = assert.async();
    retry(()=>{
      return resolve('success');
    }).then((result)=>{
      assert.equal(result, 'success');
      done();
    }).catch((error)=>{
      assert.ok(false, error);
      done();
    });
  });

  test('it works with function returning a scalar', function(assert) {
    let done = assert.async();
    retry(() => {
      return 'success';
    }).then((result)=>{
      assert.equal(result, 'success');
      done();
    }).catch((error)=>{
      assert.ok(false, error);
      done();
    });
  });

  test('throws errors, rejects promise then eventually passes', function (assert) {
    assert.expect(4);
    let done = assert.async();
    let count = 0;
    retry((resolve, reject)=> {
      count = count + 1;
      if(count === 1){
        assert.ok(true);
        throw `count ${count}`;
      }else if(count === 2){
        assert.ok(true);
        throw `count ${count}`;
      }else if(count === 3){
        assert.ok(true);
        later(() => reject(`count ${count}`), 1);
      }else if(count === 4){
        resolve('my return');
      }
    }, 5, ()=>{return 2;}).then((result)=>{
      assert.equal(result, 'my return');
      done();
    }).catch((error)=>{
      assert.ok(false, `with error: ${error}`);
      done();
    });
  });

  test('backoff delay count starts at 0 and increments by 1 until max', function(assert){
    assert.expect(6);
    let done = assert.async();
    let count = 0;
    retry(()=> {
      count = count + 1;
      throw `count ${count}`;
      }, 5, (retry)=>{
        assert.equal(retry, count-1);
        return 1;
      }
    ).then(()=>{
      assert.ok(false);
      done();
    }).catch(()=>{
      assert.ok(true);
      done();
    });

  });

  module('conditionFnc', function() {

    let fncToRetry = () => { throw count++ };
    let maxRetries = 5;
    let delayFnc = () => 2;
    let count = 0;

    test('does not retry if the condition fails', function(assert){
      assert.expect(2);
      let done = assert.async();
      count = 0;
      let conditionFnc = () => {
        assert.ok(true);
        return false;
      }

      retry(
        fncToRetry,
        maxRetries,
        delayFnc,
        conditionFnc
      )
      .then(() => done())
      .catch((errorCount)=>{
        assert.equal(errorCount, 0);
        done();
      });
    });

    test('retries if the condition passes until maxRetries', function(assert){
      assert.expect(6);
      let done = assert.async();
      count = 0;
      let conditionFnc = () => {
        assert.ok(true);
        return true;
      }

      retry(
        fncToRetry,
        maxRetries,
        delayFnc,
        conditionFnc
      )
      .then(() => done())
      .catch((errorCount)=>{
        assert.equal(errorCount, 5);
        done();
      });
    });

    test('retries if the condition passes until no failure', function(assert){
      assert.expect(3);
      let done = assert.async();
      count = 0;
      fncToRetry = () => {
        if (count == 3) return count;
        throw count++;
      };
      let conditionFnc = () => {
        assert.ok(true);
        return true;
      }

      retry(
        fncToRetry,
        maxRetries,
        delayFnc,
        conditionFnc
      )
      .then(() => done())
      .catch((errorCount)=>{
        assert.equal(errorCount, 3);
        done();
      });
    });
  });
});
