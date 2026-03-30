import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/reel_pager.dart';

class ReelsViewScreen extends StatelessWidget {
  const ReelsViewScreen({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InstaBlocBloc, InstaBlocState>(
      builder: (BuildContext context, InstaBlocState state) {
        return Scaffold(
          body: Column(
            children: <Widget>[
              Expanded(
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(0),
                    child: ReelPager(
                      items: state.posts,
                      title: 'Reels',
                      subtitle: 'Short-form highlights',
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
